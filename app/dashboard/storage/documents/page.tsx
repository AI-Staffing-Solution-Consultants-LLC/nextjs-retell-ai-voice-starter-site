"use client"

import { useState } from "react"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { useDocuments } from "@/hooks/use-documents"
import { Document } from '@/app/types/document'
import { UploadDocumentForm } from "./upload-document-form"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { ColumnDef } from "@tanstack/react-table"
import { useQueryClient } from '@tanstack/react-query'

export default function DocumentsPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const { documents, isLoading, error } = useDocuments()
  const queryClient = useQueryClient()

  console.log('Page documents:', documents)

  const columns: ColumnDef<Document>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'category',
      header: 'Category',
    },
    {
      accessorKey: 'subcategory',
      header: 'Subcategory',
    },
    {
      accessorKey: 'file_type',
      header: 'Type',
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
  ]

  const handleUpload = async (data: Partial<Document> & { file: File }) => {
    try {
      console.log('Starting upload with data:', data);
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined) {
          formData.append(key, String(value));
        }
      });

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['rag-documents'] })
      setIsUploadModalOpen(false)
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    setIsUploadModalOpen(false);
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          Erreur de chargement: {error.message}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      </div>
    )
  }

  const hasDocuments = documents && documents.length > 0

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Button onClick={() => setIsUploadModalOpen(true)}>
          Upload Document
        </Button>
      </div>

      {!hasDocuments ? (
        <div className="text-center py-10 text-gray-500">
          Aucun document trouvé. Commencez par en uploader un.
        </div>
      ) : (
        <DataTable
          data={documents}
          columns={columns}
        />
      )}

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <UploadDocumentForm
            onSubmit={handleUpload}
            onCancel={handleCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}