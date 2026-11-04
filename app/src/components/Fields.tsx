import { Eye, EyeSlash } from '@phosphor-icons/react'
import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from '../pages/Page.module.css'

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className' | 'onChange'>

// A labelled input. The hint and error sit outside the label, so the field's name stays the label.
export function TextField({
  label,
  error,
  hint,
  trailing,
  invalid,
  onChange,
  ...input
}: InputProps & {
  label: string
  error?: string
  // Red outline with no message of its own: the form's alert says what's wrong (a wrong password).
  invalid?: boolean
  hint?: string
  trailing?: ReactNode
  onChange: (v: string) => void
}) {
  const id = useId()
  const describedBy = [hint && !error && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const field = (
    <input
      id={id}
      className={`${styles.input} ${trailing ? styles.withTrail : ''}`}
      aria-invalid={error || invalid ? true : undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
      {...input}
    />
  )
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldLabel}>
        {label}
      </label>
      {trailing ? (
        <span className={styles.control}>
          {field}
          {trailing}
        </span>
      ) : (
        field
      )}
      {hint && !error && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  )
}

export function PasswordField({
  label = 'Password',
  autoComplete,
  ...props
}: Omit<Parameters<typeof TextField>[0], 'label' | 'type' | 'trailing'> & {
  label?: string
  autoComplete: 'current-password' | 'new-password'
}) {
  const [show, setShow] = useState(false)
  return (
    <TextField
      {...props}
      label={label}
      type={show ? 'text' : 'password'}
      autoComplete={autoComplete}
      trailing={
        <button
          type="button"
          className={styles.reveal}
          aria-pressed={show}
          aria-label={`Show ${label.toLowerCase()}`}
          onClick={() => setShow((s) => !s)}
        >
          {show ? (
            <EyeSlash size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>
      }
    />
  )
}
