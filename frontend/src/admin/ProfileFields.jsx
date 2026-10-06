import { inputStyles } from './ui.jsx';

// Reusable name/email/username/password inputs for registration and profile forms.
export function ProfileFields({ form, onChange, idPrefix, passwordLabel = 'Contraseña', passwordRequired = true, disabled }) {
  const update = (field) => (event) => onChange({ ...form, [field]: event.target.value });
  const field = (key, label, props = {}) => (
    <div>
      <label htmlFor={`${idPrefix}-${key}`} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input id={`${idPrefix}-${key}`} className={inputStyles} value={form[key]} onChange={update(key)} disabled={disabled} {...props} />
    </div>
  );

  return (
    <>
      {field('name', 'Nombre', { autoComplete: 'name', minLength: 2, maxLength: 80, required: true })}
      {field('email', 'Correo', { type: 'email', autoComplete: 'email', maxLength: 160, required: true })}
      <div>
        {field('username', 'Nombre de usuario', {
          autoComplete: 'username', autoCapitalize: 'none', spellCheck: false, minLength: 3, maxLength: 30,
          pattern: '[a-zA-Z0-9._]{3,30}', required: true,
        })}
        <p className="mt-1 text-xs text-neutral-500">Para iniciar sesión más rápido. Letras, números, punto o guion bajo.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('password', passwordLabel, { type: 'password', autoComplete: 'new-password', minLength: 8, maxLength: 72, required: passwordRequired })}
        {field('confirm', 'Repite la contraseña', { type: 'password', autoComplete: 'new-password', required: passwordRequired || Boolean(form.password) })}
      </div>
    </>
  );
}
