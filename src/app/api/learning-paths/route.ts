import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    const paths = await prisma.learningPath.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        items: {
          include: {
            challenge: {
              select: { id: true, title: true, point: true, difficulty: true },
            },
            lesson: {
              select: { id: true, title: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // If user is authenticated, calculate progress for each path
    let userSolvedChallenges = new Set<string>();
    let userCompletedLessons = new Set<string>();

    if (session) {
      const [submissions, lessonProgresses] = await Promise.all([
        prisma.challengeSubmission.findMany({
          where: { userId: session.id, status: 'CORRECT' },
          select: { challengeId: true },
        }),
        prisma.courseProgress.findMany({
          where: { userId: session.id, isCompleted: true },
          select: { lessonId: true },
        }),
      ]);

      submissions.forEach((s) => userSolvedChallenges.add(s.challengeId));
      lessonProgresses.forEach((lp) => userCompletedLessons.add(lp.lessonId));
    }

    const pathsWithProgress = paths.map((path) => {
      const totalItems = path.items.length;
      let completedItems = 0;

      path.items.forEach((item) => {
        if (item.challengeId && userSolvedChallenges.has(item.challengeId)) {
          completedItems += 1;
        } else if (item.lessonId && userCompletedLessons.has(item.lessonId)) {
          completedItems += 1;
        }
      });

      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        id: path.id,
        title: path.title,
        slug: path.slug,
        description: path.description,
        category: path.category,
        icon: path.icon,
        totalItems,
        completedItems,
        percentage,
        items: path.items.map((it) => ({
          id: it.id,
          orderIndex: it.orderIndex,
          type: it.challengeId ? 'CHALLENGE' : 'LESSON',
          title: it.challenge?.title || it.lesson?.title || 'Materi Belajar',
          targetId: it.challengeId || it.lessonId,
          point: it.challenge?.point || 0,
          difficulty: it.challenge?.difficulty || 'BEGINNER',
          completed: it.challengeId
            ? userSolvedChallenges.has(it.challengeId)
            : it.lessonId
            ? userCompletedLessons.has(it.lessonId)
            : false,
        })),
      };
    });

    return NextResponse.json({ paths: pathsWithProgress });
  } catch (error) {
    console.error('Error fetching learning paths:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
