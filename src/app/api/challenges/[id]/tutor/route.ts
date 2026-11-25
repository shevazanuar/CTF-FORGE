import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { chatWithTutor, ChatMessage } from '@/lib/tutor';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const limitRes = rateLimit(`tutor_chat_${ip}`, 20, 60000); // Max 20 questions/minute

    if (!limitRes.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan ke AI Tutor. Silakan tunggu ${Math.ceil(
            limitRes.retryAfter / 1000
          )} detik.`,
        },
        { status: 429 }
      );
    }

    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi.' }, { status: 401 });
    }

    const { id: challengeId } = await params;
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Pesan pertanyaan tidak boleh kosong.' }, { status: 400 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { relatedLesson: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Tantangan tidak ditemukan.' }, { status: 404 });
    }

    // Get or create TutorSession
    let tutorSession = await prisma.tutorSession.findFirst({
      where: {
        userId: session.id,
        challengeId: challenge.id,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    });

    if (!tutorSession) {
      tutorSession = await prisma.tutorSession.create({
        data: {
          userId: session.id,
          challengeId: challenge.id,
        },
        include: {
          messages: true,
        },
      });
    }

    // Build history
    const history: ChatMessage[] = (tutorSession.messages || [])
      .reverse()
      .map((m) => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      }));

    // Record user message
    await prisma.tutorMessage.create({
      data: {
        sessionId: tutorSession.id,
        role: 'USER',
        content: message.trim(),
        flagged: false,
      },
    });

    // Chat with tutor engine
    const tutorResult = await chatWithTutor(
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
      message.trim(),
      history
    );

    // Record tutor response
    await prisma.tutorMessage.create({
      data: {
        sessionId: tutorSession.id,
        role: 'TUTOR',
        content: tutorResult.message,
        flagged: tutorResult.flagged,
      },
    });

    return NextResponse.json({
      reply: tutorResult.message,
      flagged: tutorResult.flagged,
      guardTriggered: tutorResult.guardTriggered,
      provider: tutorResult.provider,
    });
  } catch (error) {
    console.error('Error in tutor chat route:', error);
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

    const tutorSession = await prisma.tutorSession.findFirst({
      where: {
        userId: session.id,
        challengeId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({
      messages: tutorSession?.messages || [],
    });
  } catch (error) {
    console.error('Error fetching tutor messages:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
