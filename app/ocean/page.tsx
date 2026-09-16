import type { Metadata } from 'next';
import OceanGame from './OceanGame';

export const metadata: Metadata = {
  title: 'Ocean — Backgammon',
  description: 'A quieter kind of competition. A modern backgammon experience.',
};

export default function OceanPage() {
  return <OceanGame />;
}
