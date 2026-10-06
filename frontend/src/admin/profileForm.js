export const emptyProfile = { name: '', email: '', username: '', password: '', confirm: '' };

export function passwordMismatch(form) {
  return (form.password || form.confirm) && form.password !== form.confirm ? 'Las contraseñas no coinciden.' : '';
}

export function profilePayload(form) {
  const { confirm: _confirm, ...payload } = form;
  return payload;
}
