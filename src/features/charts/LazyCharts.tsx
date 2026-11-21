import { lazy, Suspense, type ComponentProps } from 'react';
import { ChartSkeleton } from '../../components/Skeleton';

/**
 * Recharts is the largest dependency, so charts load in a separate bundle.
 * The first page appears faster, and the skeleton is a genuine loading state.
 */
const Cashflow = lazy(() => import('./CashflowChart'));
const Donut = lazy(() => import('./CategoryDonut'));
const Trend = lazy(() => import('./TrendChart'));
const Savings = lazy(() => import('./SavingsChart'));

export function LazyCashflowChart(props: ComponentProps<typeof Cashflow>) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height ?? 280} />}>
      <Cashflow {...props} />
    </Suspense>
  );
}

export function LazyCategoryDonut(props: ComponentProps<typeof Donut>) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height ?? 240} />}>
      <Donut {...props} />
    </Suspense>
  );
}

export function LazyTrendChart(props: ComponentProps<typeof Trend>) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height ?? 280} />}>
      <Trend {...props} />
    </Suspense>
  );
}

export function LazySavingsChart(props: ComponentProps<typeof Savings>) {
  return (
    <Suspense fallback={<ChartSkeleton height={props.height ?? 260} />}>
      <Savings {...props} />
    </Suspense>
  );
}
