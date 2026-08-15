import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Organización seleccionada (estado de UI, persistido). El detalle vive en TanStack Query. */
interface OrgState {
  selectedOrgId: string | null
  setSelectedOrgId: (id: string | null) => void
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      selectedOrgId: null,
      setSelectedOrgId: (id) => set({ selectedOrgId: id }),
    }),
    { name: 'nummo-org' },
  ),
)
