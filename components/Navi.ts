import {
  Building2,
  FileCode2,
  LayoutDashboard,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tags,
  Target,
  Users,
  Wrench,
} from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  subItems?: NavItem[];
  beta?: boolean;
}

export const navLinks: NavItem[] = [
  {
    name: "OCI Policy Governance",
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
        name: "Group Access",
        href: "/oci-policy-analysis/group-access",
        icon: Users,
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
  {
    name: "OCI Policy Risk Management",
    href: "/oci-policy-risk-management",
    icon: ShieldAlert,
    subItems: [
      {
        name: "Overview",
        href: "/oci-policy-risk-management",
        icon: LayoutDashboard,
      },
      {
        name: "Tenant Posture",
        href: "/oci-policy-risk-management/tenant-posture",
        icon: Building2,
      },
      {
        name: "Guardrails",
        href: "/oci-policy-risk-management/guardrails",
        icon: ShieldCheck,
      },
      {
        name: "Risk Remediation",
        href: "/oci-policy-risk-management/risk-remediation",
        icon: Wrench,
      },
    ],
  },
];
