import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { logAdminAction } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    const [challenges, userHintUsages] = await Promise.all([
      prisma.challenge.findMany({
        include: {
          creator: {
            select: { name: true },
          },
          submissions: session
            ? {
                where: { userId: session.id },
                orderBy: { submittedAt: 'desc' },
                take: 1,
              }
            : false,
        },
        orderBy: { createdAt: 'desc' },
      }),
      session
        ? prisma.hintUsage.findMany({
            where: { userId: session.id },
            select: { challengeId: true, level: true, pointPenalty: true },
          })
        : Promise.resolve([]),
    ]);

    // Map unlocked hint levels per challenge
    const unlockedHintsMap = new Map<string, number[]>();
    userHintUsages.forEach((hu) => {
      const existing = unlockedHintsMap.get(hu.challengeId) || [];
      existing.push(hu.level);
      unlockedHintsMap.set(hu.challengeId, existing);
    });

    // Strip sensitive fields (flagHash and solution) for standard users
    const sanitizedChallenges = challenges.map((ch) => {
      const isSolved =
        ch.submissions && ch.submissions.length > 0 && ch.submissions[0].status === 'CORRECT';

      const showSolution = session?.role === 'ADMIN' || isSolved;
      const unlockedLevels = unlockedHintsMap.get(ch.id) || [];

      return {
        id: ch.id,
        title: ch.title,
        description: ch.description,
        category: ch.category,
        difficulty: ch.difficulty,
        point: ch.point,
        hint: ch.hint,
        hintLevel1: session?.role === 'ADMIN' || unlockedLevels.includes(1) ? ch.hintLevel1 : null,
        hintLevel2: session?.role === 'ADMIN' || unlockedLevels.includes(2) ? ch.hintLevel2 : null,
        hintLevel3: session?.role === 'ADMIN' || unlockedLevels.includes(3) ? ch.hintLevel3 : null,
        unlockedLevels,
        relatedLessonId: ch.relatedLessonId,
        creator: ch.creator,
        solved: isSolved,
        solution: showSolution ? ch.solution : null,
      };
    });

    return NextResponse.json({ challenges: sanitizedChallenges });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya untuk Admin.' }, { status: 403 });
    }

    const {
      title,
      description,
      category,
      difficulty,
      point,
      flag,
      hint,
      hintLevel1,
      hintLevel2,
      hintLevel3,
      solution,
      relatedLessonId,
    } = await request.json();

    if (!title || !description || !category || !difficulty || !point || !flag) {
      return NextResponse.json(
        { error: 'Judul, deskripsi, kategori, kesulitan, poin, dan flag wajib diisi.' },
        { status: 400 }
      );
    }

    // Hash the flag to store securely
    const flagHash = await hashPassword(flag.trim());

    const challenge = await prisma.challenge.create({
      data: {
        title,
        description,
        category,
        difficulty,
        point: parseInt(point),
        flagHash,
        hint: hint || null,
        hintLevel1: hintLevel1 || null,
        hintLevel2: hintLevel2 || null,
        hintLevel3: hintLevel3 || null,
        solution: solution || null,
        relatedLessonId: relatedLessonId || null,
        createdBy: session.id,
      },
    });

    await logAdminAction(
      session.id,
      'CREATE_CHALLENGE',
      'Challenge',
      challenge.id,
      `Created challenge "${title}" (Category: ${category}, Difficulty: ${difficulty}, Points: ${point})`
    );

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (error) {
    console.error('Error creating challenge:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
