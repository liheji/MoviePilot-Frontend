import type { ValidationRule } from 'vuetify/types/services/validation'
import { useI18n } from 'vue-i18n'

// 必输校验
export const requiredValidator: ValidationRule = (value: any) => {
  const { t } = useI18n()
  return !!value || t('validators.required')
}

// 数字校验
export const numberValidator: ValidationRule = (value: any) => {
  const { t } = useI18n()
  return !isNaN(value) || t('validators.number')
}
