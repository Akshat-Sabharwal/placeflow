import { PageHeader } from "@/components/page-header";
import { DocumentWorkspace } from "@/components/document-workspace";

export default function StudentDocumentsPage() {
  return <><PageHeader eyebrow="Private documents" title="Document library" description="Store and view placement files securely. Resume documents remain available for applications." /><DocumentWorkspace /></>;
}
