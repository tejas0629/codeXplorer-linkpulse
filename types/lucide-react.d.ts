declare module "lucide-react" {
  import * as React from "react";

  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    className?: string;
  }

  export type LucideIcon = React.ForwardRefExoticComponent<
    React.PropsWithoutRef<LucideProps> & React.RefAttributes<SVGSVGElement>
  >;

  export const CheckIcon: LucideIcon;
  export const ChevronDownIcon: LucideIcon;
  export const ChevronRightIcon: LucideIcon;
  export const ChevronUpIcon: LucideIcon;
  export const CircleIcon: LucideIcon;
  export const XIcon: LucideIcon;
  export const CircleCheckIcon: LucideIcon;
  export const InfoIcon: LucideIcon;
  export const Loader2Icon: LucideIcon;
  export const OctagonXIcon: LucideIcon;
  export const TriangleAlertIcon: LucideIcon;

  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const X: LucideIcon;

  const content: Record<string, LucideIcon>;
  export default content;
}
