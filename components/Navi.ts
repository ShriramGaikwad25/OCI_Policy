import { FileCode2, Shield, Tags, Target } from "lucide-react";

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
