export interface CompartmentTreeNode {
  id: string;
  name: string;
  resourceCount: number | null;
  resourceType: string | null;
  children: CompartmentTreeNode[];
}

export interface CompartmentsTreeResult {
  tenancyId: string | null;
  tenancyName: string | null;
  root: CompartmentTreeNode | null;
}
