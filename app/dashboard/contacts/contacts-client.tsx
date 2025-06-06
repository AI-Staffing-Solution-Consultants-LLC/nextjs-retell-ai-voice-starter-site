"use client"

import { useState, useCallback } from "react"
import { createColumns } from "./columns"
import { LoadingState } from "./loading-state"
import { ErrorState } from "./error-state"
import { EmptyState } from "./empty-state"
import { type Contact } from "@/app/types/contact"
import { type Filters } from "@/app/types/filters"
import { 
  type PaginationState, 
  getCoreRowModel, 
  getPaginationRowModel, 
  useReactTable, 
  type Updater,
  flexRender 
} from "@tanstack/react-table"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Toolbar } from "./toolbar"
import { useContacts } from "@/hooks/use-contacts"
import { useToast } from "@/hooks/use-toast"
import { EditContactDialog } from "./edit-contact-dialog"

export function ContactsClient() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: null,
    sortBy: null,
    sortOrder: null,
    tags: []
  })

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const { 
    contacts, 
    isLoading, 
    error, 
    mutate,
    pagination: contactsPagination,
    editContact
  } = useContacts({
    pagination,
    filters
  })
  
  const { toast } = useToast()

  const handleEditClick = useCallback((contact: Contact) => {
    setSelectedContact(contact)
  }, [])

  const table = useReactTable({
    data: contacts,
    columns: createColumns(handleEditClick),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount: contactsPagination.totalPages,
    state: {
      pagination: {
        pageIndex: contactsPagination.pageIndex,
        pageSize: contactsPagination.pageSize,
      },
    },
    onPaginationChange: useCallback((updaterOrValue: Updater<PaginationState>) => {
      setPagination(typeof updaterOrValue === 'function' 
        ? updaterOrValue(pagination)
        : updaterOrValue
      )
    }, [pagination]),
    manualPagination: true,
  })

  const handleAddContact = useCallback(async (data: Partial<Contact>) => {
    try {
      const newContact: Partial<Contact> = {
        ...data,
        dateJoined: new Date().toISOString(),
        notifications: {
          lastInteraction: null,
          history: []
        },
        provider: {
          site: data.provider?.site || "",
          funnel: data.provider?.funnel || "",
          call: data.provider?.call || "",
          vip: data.provider?.vip || false,
        }
      }

      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      })
      
      if (!response.ok) throw new Error("Failed to add contact")
      
      const { data: createdContact } = await response.json()

      if (createdContact.id) {
        await fetch("/api/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: createdContact.id,
            type: "Email Entrant",
            date: new Date().toISOString(),
            score: 0,
            metadata: { initial: true }
          })
        })
      }
      
      await mutate()
      
      toast({
        title: "Contact ajouté",
        description: "Le contact a été ajouté avec succès",
      })
    } catch (error) {
      console.error('Error adding contact:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add contact"
      })
    }
  }, [mutate, toast])

  const handleImportContact = useCallback(async (contacts: Partial<Contact>[]) => {
    try {
      const response = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      })
      
      if (!response.ok) throw new Error("Failed to import contacts")
      
      await mutate()
      
      toast({
        title: "Contacts importés",
        description: "Les contacts ont été importés avec succès",
      })
    } catch (error) {
      console.error('Error importing contacts:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import contacts"
      })
    }
  }, [mutate, toast])

  const handleEdit = useCallback(async (data: Partial<Contact>) => {
    try {
      if (!selectedContact?.id) {
        throw new Error("No contact selected")
      }
      await editContact(selectedContact.id, data)
      setSelectedContact(null)
    } catch (error) {
      console.error('Failed to edit contact:', error)
    }
  }, [selectedContact, editContact])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Contacts</h1>
        <Toolbar 
          onAddContact={handleAddContact} 
          onImportContact={handleImportContact}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
      
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState 
          message={error instanceof Error ? error.message : String(error)} 
          onRetry={() => mutate()} 
        />
      ) : contacts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      <EditContactDialog
        contact={selectedContact}
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        onEdit={handleEdit}
      />
    </div>
  )
}
