import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getProgressiveHint, HintLevel } from '@/lib/tutor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi.' }, { status: 401 });
    }

    const { id: challengeId } = await params;
    const body = await request.json();
    const requestedLevel = Number(body.level) as HintLevel;

    if (![1, 2, 3].includes(requestedLevel)) {
      return NextResponse.json(
        { error: 'Level hint tidak valid. Pilihan level: 1, 2, atau 3.' },
        { status: 400 }
      );
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        relatedLesson: true,
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Tantangan tidak ditemukan.' }, { status: 404 });
    }

    // Check unlocked hint history for this user
    const existingHints = await prisma.hintUsage.findMany({
      where: {
        userId: session.id,
        challengeId: challenge.id,
      },
      orderBy: { level: 'asc' },
    });

    const unlockedLevels = new Set(existingHints.map((h) => h.level));

    // Enforce sequential progression (Scenario T6)
    if (requestedLevel === 2 && !unlockedLevels.has(1)) {
      return NextResponse.json(
        { error: 'Anda harus membuka Hint Level 1 terlebih dahulu sebelum membuka Level 2.' },
        { status: 400 }
      );
    }

    if (requestedLevel === 3 && (!unlockedLevels.has(1) || !unlockedLevels.has(2))) {
      return NextResponse.json(
        { error: 'Anda harus membuka Hint Level 1 dan Level 2 terlebih dahulu sebelum membuka Level 3.' },
        { status: 400 }
      );
    }

    // Determine point penalty
    const penaltyMap: Record<HintLevel, number> = {
      1: 5,
      2: 15,
      3: 30,
    };
    const penalty = penaltyMap[requestedLevel];

    let newlyUnlocked = false;
    if (!unlockedLevels.has(requestedLevel)) {
      await prisma.hintUsage.create({
        data: {
          userId: session.id,
          challengeId: challenge.id,
          level: requestedLevel,
          pointPenalty: penalty,
        },
      });
      newlyUnlocked = true;
    }

    // Generate progressive hint
    const hintResult = await getProgressiveHint(
      {
        challengeId: challenge.id,
        title: challenge.title,
        category: challenge.category,
        difficulty: challenge.difficulty,
        description: challenge.description,
        hintLevel1: challenge.hintLevel1 || challenge.hint,
        hintLevel2: challenge.hintLevel2,
        hintLevel3: challenge.hintLevel3,
        relatedLessonContent: challenge.relatedLesson?.content,
      },
      requestedLevel
    );

    // Calculate total penalty applied so far
    const totalPenalty = existingHints.reduce((sum, h) => sum + h.pointPenalty, 0) + (newlyUnlocked ? penalty : 0);
    const effectivePoints = Math.max(10, challenge.point - totalPenalty);

    return NextResponse.json({
      level: requestedLevel,
      hint: hintResult.message,
      pointPenalty: penalty,
      totalPenalty,
      effectivePoints,
      unlockedLevels: Array.from(new Set([...unlockedLevels, requestedLevel])).sort(),
      guardTriggered: hintResult.guardTriggered,
      provider: hintResult.provider,
    });
  } catch (error) {
    console.error('Error fetching hint:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi.' }, { status: 401 });
    }

    const { id: challengeId } = await params;

    const hints = await prisma.hintUsage.findMany({
      where: {
        userId: session.id,
        challengeId,
      },
      orderBy: { level: 'asc' },
    });

    return NextResponse.json({
      unlockedHints: hints,
      unlockedLevels: hints.map((h) => h.level),
    });
  } catch (error) {
    console.error('Error fetching unlocked hints:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
