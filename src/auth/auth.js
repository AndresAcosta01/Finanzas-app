"use strict";

/* ----------------------------------------------------------------
 * 7) MÓDULO: AUTENTICACIÓN
 * ---------------------------------------------------------------- */
const Auth = {
  getUsers() { return Storage.read('users', []); },
  saveUsers(u) { Storage.write('users', u); },

  async seedAdmin() {
    const users = this.getUsers();
    if (!users.some(u => u.email === CONFIG.admin.email)) {
      users.push({
        id: 'usr_admin',
        name: CONFIG.admin.name,
        email: CONFIG.admin.email,
        passwordHash: await Utils.hash(CONFIG.admin.password),
        role: 'admin',
        createdAt: Utils.nowISO(),
      });
      this.saveUsers(users);
    }
  },

  async register({ name, email, password }) {
    email = email.trim().toLowerCase();
    const users = this.getUsers();
    if (users.some(u => u.email === email)) throw new Error('Ya existe una cuenta con ese correo.');
    const user = { id: Utils.uid('usr'), name: name.trim(), email, passwordHash: await Utils.hash(password), role: 'usuario', createdAt: Utils.nowISO() };
    users.push(user); this.saveUsers(users);
    return user;
  },

  async login(email, password) {
    email = email.trim().toLowerCase();
    const user = this.getUsers().find(u => u.email === email);
    if (!user) throw new Error('Correo no registrado.');
    const hash = await Utils.hash(password);
    if (hash !== user.passwordHash) throw new Error('Contraseña incorrecta.');
    Storage.write('session', { userId: user.id, at: Utils.nowISO() });
    this.setCurrent(user);
    return user;
  },

  setCurrent(user) {
    State.user = { ...user }; delete State.user.passwordHash;
    State.userId = user.id;
  },

  logout() {
    Storage.remove('session');
    State.user = null; State.userId = null;
    location.reload();
  },

  restore() {
    const session = Storage.read('session', null);
    if (!session) return false;
    const user = this.getUsers().find(u => u.id === session.userId);
    if (!user) return false;
    this.setCurrent(user);
    return true;
  },

  async forgot(email) {
    const user = this.getUsers().find(u => u.email === email.trim().toLowerCase());
    // Recuperación simulada: generamos token y permitimos definir nueva contraseña
    return !!user;
  },

  async resetPassword(email, newPassword) {
    const users = this.getUsers();
    const i = users.findIndex(u => u.email === email.trim().toLowerCase());
    if (i < 0) return false;
    users[i].passwordHash = await Utils.hash(newPassword);
    this.saveUsers(users);
    return true;
  },
};
