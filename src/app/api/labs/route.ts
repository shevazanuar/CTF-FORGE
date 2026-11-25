import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi.' }, { status: 401 });
    }

    const { challengeId, action } = await request.json();

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId wajib disertakan.' }, { status: 400 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Tantangan tidak ditemukan.' }, { status: 404 });
    }

    // Stop lab action
    if (action === 'stop') {
      await prisma.labInstance.updateMany({
        where: {
          userId: session.id,
          challengeId,
          status: 'RUNNING',
        },
        data: {
          status: 'STOPPED',
        },
      });

      return NextResponse.json({
        message: 'Lab container berhasil dihentikan.',
        status: 'STOPPED',
      });
    }

    // Start or renew lab instance
    // Lab expires in 15 minutes (900,000 ms)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Stop any existing running labs for this user & challenge
    await prisma.labInstance.updateMany({
      where: {
        userId: session.id,
        challengeId,
        status: 'RUNNING',
      },
      data: {
        status: 'STOPPED',
      },
    });

    // Create fresh isolated sandbox instance
    const instanceSlug = `${challenge.category.toLowerCase()}-${challenge.id.slice(0, 8)}`;
    const instanceUrl = `/challenges?tab=challenges&id=${challenge.id}&lab=active#interactive-lab`;

    const newInstance = await prisma.labInstance.create({
      data: {
        userId: session.id,
        challengeId: challenge.id,
        status: 'RUNNING',
        instanceUrl,
        expiresAt,
      },
    });

    return NextResponse.json({
      message: 'Lab terisolasi berhasil dijalankan.',
      instanceId: newInstance.id,
      status: 'RUNNING',
      instanceUrl,
      expiresAt: newInstance.expiresAt,
      durationMinutes: 15,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        category: challenge.category,
      },
    });
  } catch (error) {
    console.error('Error managing lab instance:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    if (!session) {
      return NextResponse.json({ error: 'Tidak terotentikasi.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get('challengeId');

    const now = new Date();

    const instance = await prisma.labInstance.findFirst({
      where: {
        userId: session.id,
        ...(challengeId ? { challengeId } : {}),
        status: 'RUNNING',
        expiresAt: { gt: now },
      },
      include: {
        challenge: {
          select: { id: true, title: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!instance) {
      return NextResponse.json({
        active: false,
        instance: null,
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((instance.expiresAt.getTime() - now.getTime()) / 1000));

    return NextResponse.json({
      active: true,
      remainingSeconds,
      instance: {
        id: instance.id,
        challengeId: instance.challengeId,
        challengeTitle: instance.challenge.title,
        category: instance.challenge.category,
        instanceUrl: instance.instanceUrl,
        expiresAt: instance.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching lab status:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}
