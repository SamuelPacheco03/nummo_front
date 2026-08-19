import { expect, test } from 'vitest'
import {
  groupPermissions,
  permissionAction,
  permissionLabel,
  permissionResource,
} from './permission-labels'
import { ALL_PERMISSIONS, type Permission } from './permissions'

test('el nombre se compone del recurso y del verbo, no de una tabla de 53', () => {
  expect(permissionLabel('payments.reverse')).toBe('Pagos · Reversar')
  // Tres partes: el recurso es todo menos la última.
  expect(permissionResource('organization.branches.manage')).toBe('Sedes')
  expect(permissionAction('organization.branches.manage')).toBe('Gestionar')
  expect(permissionLabel('assistant.settings.read')).toBe('Ajustes de Numi · Ver')
})

test('todo el catálogo tiene nombre: ninguno se enseña crudo', () => {
  // Es lo que hace que un permiso nuevo del backend se note al mirar la
  // pantalla en vez de aparecer como `disbursements.approve`.
  const crudos = ALL_PERMISSIONS.filter(
    (p) => permissionResource(p).includes('_') || permissionAction(p).includes('_'),
  )
  expect(crudos).toEqual([])
})

test('agrupa por área y, dentro, por recurso', () => {
  const grupos = groupPermissions(['payments.read', 'payments.reverse', 'contacts.write'])

  expect(grupos.map((g) => g.area)).toEqual(['Contactos', 'Cartera'])
  const cartera = grupos.find((g) => g.area === 'Cartera')!
  expect(cartera.resources).toHaveLength(1)
  expect(cartera.resources[0]?.label).toBe('Pagos')
  expect(cartera.resources[0]?.permissions).toEqual(['payments.read', 'payments.reverse'])
})

test('un recurso que el catálogo estrene no se pierde: cae en «Otros»', () => {
  // Sin esto, un permiso nuevo desaparecería del editor de roles sin que nadie
  // se enterara, y el rol se guardaría sin él.
  const grupos = groupPermissions(['inventario.read' as Permission])

  expect(grupos.map((g) => g.area)).toEqual(['Otros'])
  expect(grupos[0]?.resources[0]?.label).toBe('inventario')
})

test('el catálogo que se ofrece es el del contrato, no una lista escrita aquí', () => {
  expect(ALL_PERMISSIONS).toContain('disbursements.approve')
  expect(ALL_PERMISSIONS).toContain('organization.roles.manage')
  expect(ALL_PERMISSIONS.length).toBeGreaterThan(50)
})
