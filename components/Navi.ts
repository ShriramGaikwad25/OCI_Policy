import { Target } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: NavItem[];
  beta?: boolean;
}

export const navLinks: NavItem[] = [
  {
    name: "Policy Optimization",
    href: "/oci-policy-analysis/policy-optimization",
    icon: Target,
  },
];
