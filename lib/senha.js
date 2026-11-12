// Regra de senha ao criar ou trocar: mínimo de 8 caracteres e pelo menos 1 caractere especial (ex.: ! ? @ # $ %).
export const SENHA_REGRA = 'Mínimo de 8 caracteres e 1 caractere especial (por exemplo ! ? @ # $).';
export const senhaForte = (s) => typeof s === 'string' && s.length >= 8 && /[^A-Za-z0-9\s]/.test(s);
