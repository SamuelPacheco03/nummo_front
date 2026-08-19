import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type {
  AdminOrganizationDetailDto,
  FeatureMap,
  FeaturePatch,
  LimitMap,
  LimitPatch,
} from '@/api/generated/model'
import { Field } from '@/components/ui/field'
import { FormDialog } from '@/components/ui/form-dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { toastApiError } from '@/features/platform/errors'
import { FEATURE_KEYS, featureTitle, LIMIT_KEYS, limitLabel } from '@/features/platform/labels'
import { useSetOverrides } from './hooks'

/**
 * Un override tiene **tres** estados, no dos, y confundirlos es el error caro:
 * «lo que diga el plan» no es lo mismo que «sin límite», y «sin límite» no es
 * cero. Por eso cada tope lleva un selector y no una casilla.
 */
type LimitMode = 'plan' | 'unlimited' | 'custom'
type FeatureMode = 'plan' | 'yes' | 'no'

type LimitKey = keyof LimitMap
type FeatureKey = keyof FeatureMap

function initialLimits(overrides: LimitPatch): {
  modes: Record<LimitKey, LimitMode>
  values: Record<LimitKey, string>
} {
  const modes = {} as Record<LimitKey, LimitMode>
  const values = {} as Record<LimitKey, string>
  for (const key of LIMIT_KEYS) {
    const has = Object.hasOwn(overrides, key)
    const value = overrides[key]
    modes[key] = !has ? 'plan' : value === null ? 'unlimited' : 'custom'
    values[key] = typeof value === 'number' ? String(value) : ''
  }
  return { modes, values }
}

function initialFeatures(overrides: FeaturePatch): Record<FeatureKey, FeatureMode> {
  const modes = {} as Record<FeatureKey, FeatureMode>
  for (const key of FEATURE_KEYS) {
    modes[key] = !Object.hasOwn(overrides, key) ? 'plan' : overrides[key] ? 'yes' : 'no'
  }
  return modes
}

/**
 * **Negociar features y topes para un cliente concreto**, por encima de lo que
 * dice su plan: un Pro con quince usuarios acordados.
 *
 * Se manda el conjunto entero (`PUT`), así que lo que se deja en «Lo que diga el
 * plan» **se quita** como override. Es lo que hace que volver atrás sea posible
 * sin un botón de borrar aparte.
 */
export function OverridesDialog({
  detail,
  open,
  onOpenChange,
}: {
  detail: AdminOrganizationDetailDto
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const save = useSetOverrides()
  const [limitModes, setLimitModes] = useState(() => initialLimits(detail.overrides.limits).modes)
  const [limitValues, setLimitValues] = useState(
    () => initialLimits(detail.overrides.limits).values,
  )
  const [featureModes, setFeatureModes] = useState(() => initialFeatures(detail.overrides.features))

  useEffect(() => {
    if (!open) return
    const { modes, values } = initialLimits(detail.overrides.limits)
    setLimitModes(modes)
    setLimitValues(values)
    setFeatureModes(initialFeatures(detail.overrides.features))
  }, [open, detail])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const limits: LimitPatch = {}
    for (const key of LIMIT_KEYS) {
      if (limitModes[key] === 'unlimited') limits[key] = null
      if (limitModes[key] === 'custom') {
        const parsed = Number(limitValues[key])
        if (!Number.isInteger(parsed) || parsed < 0) {
          toast.error(`El tope de ${limitLabel(key)} tiene que ser un entero de cero para arriba.`)
          return
        }
        limits[key] = parsed
      }
    }

    const features: FeaturePatch = {}
    for (const key of FEATURE_KEYS) {
      if (featureModes[key] !== 'plan') features[key] = featureModes[key] === 'yes'
    }

    try {
      await save.mutateAsync({ orgId: detail.id, data: { features, limits } })
      toast.success('Condiciones actualizadas')
      onOpenChange(false)
    } catch (err) {
      toastApiError(err, 'No se pudieron guardar las condiciones')
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Condiciones negociadas"
      description="Lo que se deje en «Lo que diga el plan» deja de estar negociado y vuelve a heredarse."
      submitLabel="Guardar condiciones"
      loading={save.isPending}
      onSubmit={onSubmit}
    >
      <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1 scrollbar-slim">
        {LIMIT_KEYS.map((key) => (
          <Field key={key} label={limitLabel(key).charAt(0).toUpperCase() + limitLabel(key).slice(1)}>
            <div className="flex gap-2">
              <NativeSelect
                value={limitModes[key]}
                onChange={(e) =>
                  setLimitModes((prev) => ({ ...prev, [key]: e.target.value as LimitMode }))
                }
                aria-label={`Tope de ${limitLabel(key)}`}
              >
                <option value="plan">Lo que diga el plan</option>
                <option value="unlimited">Sin límite</option>
                <option value="custom">Un tope propio</option>
              </NativeSelect>
              {limitModes[key] === 'custom' && (
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="w-28 shrink-0"
                  value={limitValues[key]}
                  onChange={(e) => setLimitValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  aria-label={`Cuántos ${limitLabel(key)}`}
                />
              )}
            </div>
          </Field>
        ))}

        {FEATURE_KEYS.map((key) => (
          <Field key={key} label={featureTitle(key)}>
            <NativeSelect
              value={featureModes[key]}
              onChange={(e) =>
                setFeatureModes((prev) => ({ ...prev, [key]: e.target.value as FeatureMode }))
              }
            >
              <option value="plan">Lo que diga el plan</option>
              <option value="yes">Incluida</option>
              <option value="no">No incluida</option>
            </NativeSelect>
          </Field>
        ))}
      </div>
    </FormDialog>
  )
}
