// 종합 보드에 올라가는 서비스 목록. 순서대로 탭과 타일이 놓인다.
import { chaeum } from './chaeum';
import type { ServiceDef } from './types';
import { widly } from './widly';

export const SERVICES: ServiceDef[] = [chaeum, widly];

export function serviceById(id: string): ServiceDef | undefined {
  return SERVICES.find((s) => s.id === id);
}

export type { ServiceDef };
