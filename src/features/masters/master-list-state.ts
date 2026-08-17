import { useEffect, useState, type ReactNode } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { MasterParams } from './hooks'

/** Los maestros son listas cortas: veinte por página no marean. */
export const MASTER_PAGE_SIZE = 20

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
  headClassName?: string
}

export interface ListResult<T> {
  items: T[]
  total: number
  totalPages: number
  isPending: boolean
  isError: boolean
  error: unknown
  isFetching: boolean
}

export interface MasterListState {
  sorting: SortingState
  setSorting: (value: SortingState) => void
  search: string
  setSearch: (value: string) => void
  active: '' | 'true' | 'false'
  setActive: (value: '' | 'true' | 'false') => void
  page: number
  setPage: (page: number) => void
  params: MasterParams
}

/** Estado de filtros/paginación para un listado de maestros. */
export function useMasterListState(): MasterListState {
  const [search, setSearch] = useState('')
  const q = useDebouncedValue(search.trim(), 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [active, setActive] = useState<'' | 'true' | 'false'>('true')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [q, active, sorting])

  const params: MasterParams = {
    page,
    pageSize: MASTER_PAGE_SIZE,
    q: q || undefined,
    isActive: active || undefined,
    sort: (sorting[0]?.id ?? 'name') as MasterParams['sort'],
    order: sorting[0]?.desc ? 'desc' : 'asc',
  }

  return { sorting, setSorting, search, setSearch, active, setActive, page, setPage, params }
}
