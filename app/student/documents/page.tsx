import { PageHeader } from "@/components/page-header";
import { DocumentWorkspace } from "@/components/document-workspace";

export default function StudentDocumentsPage() {
  return <><PageHeader eyebrow="Private documents" title="Resumes" description="Upload and manage the PDF resumes available for your placement applications." /><DocumentWorkspace /></>;
}
