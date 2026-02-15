import { SVGProps } from 'react';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> {
  size?: number | string;
  strokeWidth?: number | string;
}
