import { FileCode2, Shield, Target } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: NavItem[];
  beta?: boolean;
}

export const navLinks: NavItem[] = [
  {
    name: "OCI Policy Dashboard",
    href: "/oci-policy-analysis/policy-optimization",
    icon: Shield,
    subItems: [
      {
        name: "Policy Optimization",
        href: "/oci-policy-analysis/policy-optimization",
        icon: Target,
      },
      {
        name: "Policy Builder",
        href: "/oci-policy-analysis/policy-builder",
        icon: FileCode2,
      },
    ],
  },
];
