import { Editor } from '@/components/Editor'

export default function DocumentPage({ params }: { params: { id: string } }) {
  return (
    <div className="h-screen overflow-hidden">
      <Editor documentId={params.id} />
    </div>
  )
}
