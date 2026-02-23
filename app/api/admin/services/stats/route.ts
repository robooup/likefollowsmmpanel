import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const totalServices = await db.services.count();

    const activeServices = await db.services.count({
      where: { status: 'active', deletedAt: null },
    });

    const inactiveServices = await db.services.count({
      where: { status: 'inactive', deletedAt: null },
    });

    const trashServices = await db.services.count({
      where: { deletedAt: { not: null } },
    });

    const totalWithoutTrash = activeServices + inactiveServices;

    const popularServices = await db.services.count({
      where: {
        newOrders: {
          some: {},
        },
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyAdded = await db.services.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalServices,
        totalWithoutTrash,
        activeServices,
        inactiveServices,
        trashServices,
        popularServices,
        recentlyAdded,
      },
    });
  } catch (error: any) {
    console.error('Error fetching service stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        data: {
          totalServices: 0,
          totalWithoutTrash: 0,
          activeServices: 0,
          inactiveServices: 0,
          trashServices: 0,
          popularServices: 0,
          recentlyAdded: 0,
        },
      },
      { status: 500 }
    );
  }
} 
