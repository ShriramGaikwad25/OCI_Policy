import { FileCode2, LayoutDashboard, Shield, Tags, Target } from "lucide-react";

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
    href: "/oci-policy-analysis",
    icon: Shield,
    subItems: [
      {
        name: "Policy Dashboard",
        href: "/oci-policy-analysis",
        icon: LayoutDashboard,
      },
      {
        name: "Policy Optimization",
        href: "/oci-policy-analysis/policy-optimization",
        icon: Target,
      },
      {
        name: "Tags",
        href: "/oci-policy-analysis/tags",
        icon: Tags,
      },
      {
        name: "Policy Builder",
        href: "/oci-policy-analysis/policy-builder",
        icon: FileCode2,
      },
    ],
  },
];
