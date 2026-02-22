import { db } from '@/lib/db';

type DbLike = Pick<typeof db, 'services' | '$queryRaw'>;

function formatAvgTime(avgSeconds: number): string {
  if (avgSeconds <= 0) return 'Not enough data';
  const hours = Math.floor(avgSeconds / 3600);
  const minutes = Math.floor((avgSeconds % 3600) / 60);
  if (hours === 0 && minutes === 0) return 'Not enough data';
  if (hours === 0) return minutes === 1 ? '1 Minute' : `${minutes} Minutes`;
  if (minutes === 0) return hours === 1 ? '1 Hour' : `${hours} Hours`;
  return `${hours} hours and ${minutes} minutes`;
}

/**
 * Recalculates and stores avg_time for one service from the last 10 completed orders
 * (order start to end time). Call this whenever an order is marked completed.
 */
export async function updateServiceAvgTime(
  serviceId: number,
  client?: DbLike
): Promise<void> {
  const prisma = (client ?? db) as DbLike;

  const service = await prisma.services.findFirst({
    where: { id: serviceId },
    select: { id: true, name: true },
  });
  if (!service) return;

  type OrderRow = { id: number; serviceId: number; createdAt: Date; updatedAt: Date };
  const last10 = await prisma.$queryRaw<OrderRow[]>`
    SELECT id, "serviceId", "createdAt", "updatedAt"
    FROM new_orders
    WHERE "serviceId" = ${serviceId}
      AND status = 'completed'
      AND qty = 1000
    ORDER BY "updatedAt" DESC
    LIMIT 10
  `;

  if (last10.length < 10) {
    await prisma.services.update({
      where: { id: serviceId },
      data: { avg_time: 'Not enough data' },
    });
    return;
  }

  let totalSeconds = 0;
  let validOrders = 0;
  for (const order of last10) {
    const createdAt = new Date(order.createdAt);
    const updatedAt = new Date(order.updatedAt);
    const diffSeconds = Math.abs((updatedAt.getTime() - createdAt.getTime()) / 1000);
    if (diffSeconds > 0) {
      totalSeconds += diffSeconds;
      validOrders++;
    }
  }

  if (validOrders === 0) {
    await prisma.services.update({
      where: { id: serviceId },
      data: { avg_time: 'Not enough data' },
    });
    return;
  }

  const avgSeconds = totalSeconds / validOrders;
  const formattedTime = formatAvgTime(avgSeconds);
  await prisma.services.update({
    where: { id: serviceId },
    data: { avg_time: formattedTime },
  });
}
