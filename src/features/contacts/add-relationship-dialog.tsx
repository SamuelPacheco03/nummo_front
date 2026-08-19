import { useState } from 'react'
import { toast } from 'sonner'
import { Building2, Check, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SearchInput } from '@/components/search-input'
import { toastApiError } from '@/features/platform/errors'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { cn } from '@/lib/utils'
import { useAddRelationship, useContacts } from './hooks'

export function AddRelationshipDialog({
  orgId,
  contactId,
  open,
  onOpenChange,
}: {
  orgId: string
  contactId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const add = useAddRelationship(orgId)
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [relationshipType, setRelationshipType] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)

  const { contacts } = useContacts(orgId, {
    page: 1,
    pageSize: 6,
    q: q || undefined,
    isActive: 'true',
    sort: 'name',
    order: 'asc',
  })
  const candidates = contacts.filter((c) => c.id !== contactId)

  const reset = () => {
    setSearch('')
    setTargetId(null)
    setRelationshipType('')
    setIsPrimary(false)
  }

  const submit = async () => {
    if (!targetId || !relationshipType.trim()) return
    try {
      await add.mutateAsync({
        orgId,
        contactId,
        data: { targetContactId: targetId, relationshipType: relationshipType.trim(), isPrimary },
      })
      toast.success('Relación agregada')
      reset()
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudo agregar la relación')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar relación</DialogTitle>
          <DialogDescription>Vincula este contacto con otro de la organización.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Contraparte" required>
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar contacto…" />
          </Field>

          <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-1">
            {candidates.length === 0 ? (
              <p className="p-3 text-center text-sm text-muted-foreground">Sin resultados.</p>
            ) : (
              candidates.map((c) => {
                const Icon = c.contactType === 'COMPANY' ? Building2 : User
                const selected = targetId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setTargetId(c.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                      selected && 'bg-secondary',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{c.displayName}</span>
                    {selected && <Check className="ml-auto size-4 text-brand" />}
                  </button>
                )
              })
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de relación" required>
              <Input
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value)}
                placeholder="Acudiente, Estudiante…"
                maxLength={40}
              />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
              />
              Relación principal
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!targetId || !relationshipType.trim() || add.isPending}
          >
            {add.isPending && <Loader size="sm" />}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
