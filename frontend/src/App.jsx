import { useEffect, useMemo, useState } from 'react'
import { Check, ClipboardList, LogOut, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
    ...options,
  })
  const data = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(data?.message || 'No se pudo completar la solicitud.')
  return data
}

function App() {
  const [session, setSession] = useState(() => JSON.parse(localStorage.getItem('actividad6-session') || 'null'))
  const [authMode, setAuthMode] = useState('login')
  const [tasks, setTasks] = useState([])
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' })
  const [editingTask, setEditingTask] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadTasks() {
    if (!session) return
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value))
    try {
      setLoading(true)
      setTasks(await request(`/tasks?${params}`, { token: session.token }))
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTasks() }, [session, filters.search, filters.status, filters.priority])

  const summary = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    pending: tasks.filter((task) => task.status === 'pending').length,
  }), [tasks])

  async function handleAuth(event) {
    event.preventDefault()
    const body = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const data = await request(`/auth/${authMode}`, { method: 'POST', body: JSON.stringify(body) })
      localStorage.setItem('actividad6-session', JSON.stringify(data))
      setSession(data)
      setError('')
    } catch (requestError) { setError(requestError.message) }
  }

  function logout() {
    localStorage.removeItem('actividad6-session')
    setSession(null)
    setTasks([])
  }

  async function saveTask(event) {
    event.preventDefault()
    const body = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const path = editingTask ? `/tasks/${editingTask.id}` : '/tasks'
      await request(path, { method: editingTask ? 'PUT' : 'POST', body: JSON.stringify(body), token: session.token })
      setIsFormOpen(false)
      setEditingTask(null)
      await loadTasks()
    } catch (requestError) { setError(requestError.message) }
  }

  async function toggleTask(task) {
    try {
      await request(`/tasks/${task.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: task.status === 'completed' ? 'pending' : 'completed' }),
        token: session.token,
      })
      await loadTasks()
    } catch (requestError) { setError(requestError.message) }
  }

  async function removeTask(task) {
    if (!window.confirm(`¿Eliminar "${task.title}"?`)) return
    try {
      await request(`/tasks/${task.id}`, { method: 'DELETE', token: session.token })
      await loadTasks()
    } catch (requestError) { setError(requestError.message) }
  }

  if (!session) {
    return (
      <main className="auth-page">
        <section className="auth-intro">
          <div className="logo"><span>✦</span> TaskFlow</div>
          <div><p className="kicker">Actividad 6 · Framework frontend</p><h1>Organiza tus días. Avanza con claridad.</h1><p>Una aplicación para registrar, priorizar y completar tus tareas diarias.</p></div>
          <small>Desarrollada con React, Node.js, Express y MySQL.</small>
        </section>
        <section className="auth-panel">
          <div className="auth-box">
            <p className="kicker">{authMode === 'login' ? 'Bienvenido' : 'Crear cuenta'}</p>
            <h2>{authMode === 'login' ? 'Inicia sesión' : 'Regístrate'}</h2>
            {error && <div className="alert">{error}</div>}
            <form onSubmit={handleAuth}>
              {authMode === 'register' && <label>Nombre<input name="name" placeholder="Tu nombre" required /></label>}
              <label>Correo electrónico<input name="email" type="email" placeholder="correo@ejemplo.com" required /></label>
              <label>Contraseña<input name="password" type="password" placeholder="Mínimo 6 caracteres" minLength="6" required /></label>
              <button className="primary-button" type="submit">{authMode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
            </form>
            <button className="link-button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError('') }}>
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="app">
      <header className="header"><div className="logo"><span>✦</span> TaskFlow</div><div className="user-area"><span>{session.user.name}</span><button className="icon-button" onClick={logout} title="Cerrar sesión"><LogOut size={18} /></button></div></header>
      <main className="dashboard">
        <div className="dashboard-heading"><div><p className="kicker">Panel de tareas</p><h1>Hola, {session.user.name.split(' ')[0]}.</h1><p className="muted">Gestiona tus pendientes y mantén el rumbo.</p></div><button className="primary-button" onClick={() => { setEditingTask(null); setIsFormOpen(true) }}><Plus size={18} /> Nueva tarea</button></div>
        {error && <div className="alert">{error}<button onClick={() => setError('')}><X size={15} /></button></div>}
        <section className="summary"><div><span>Total</span><strong>{summary.total}</strong></div><div><span>Pendientes</span><strong>{summary.pending}</strong></div><div><span>Completadas</span><strong>{summary.completed}</strong></div></section>
        <section className="tasks-card">
          <div className="toolbar"><div className="search"><Search size={17} /><input placeholder="Buscar por título o descripción" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></div><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos los estados</option><option value="pending">Pendiente</option><option value="in-progress">En progreso</option><option value="completed">Completada</option></select><select value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}><option value="">Todas las prioridades</option><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></div>
          {loading ? <p className="empty">Cargando tareas...</p> : tasks.length ? <div className="task-list">{tasks.map((task) => <article className={`task ${task.status === 'completed' ? 'done' : ''}`} key={task.id}><button className={`check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => toggleTask(task)}>{task.status === 'completed' && <Check size={14} />}</button><div className="task-info"><h3>{task.title}</h3><p>{task.description || 'Sin descripción'}</p><small>{task.dueDate ? `Vence: ${new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('es-CO')}` : 'Sin fecha'}</small></div><span className={`badge ${task.status}`}>{task.status === 'in-progress' ? 'En progreso' : task.status === 'completed' ? 'Completada' : 'Pendiente'}</span><span className={`priority ${task.priority}`}>{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}</span><div className="actions"><button className="icon-button" onClick={() => { setEditingTask(task); setIsFormOpen(true) }} title="Editar"><Pencil size={16} /></button><button className="icon-button danger" onClick={() => removeTask(task)} title="Eliminar"><Trash2 size={16} /></button></div></article>)}</div> : <div className="empty"><ClipboardList size={30} /><strong>No hay tareas para mostrar</strong><span>Crea tu primera tarea para comenzar.</span></div>}
        </section>
      </main>
      {isFormOpen && <div className="modal-backdrop"><section className="modal"><div className="modal-title"><div><p className="kicker">{editingTask ? 'Editar tarea' : 'Nueva tarea'}</p><h2>{editingTask ? 'Actualiza la información' : 'Crea una tarea'}</h2></div><button className="icon-button" onClick={() => setIsFormOpen(false)}><X size={19} /></button></div><form onSubmit={saveTask}><label>Título<input name="title" defaultValue={editingTask?.title} required /></label><label>Descripción<textarea name="description" rows="3" defaultValue={editingTask?.description} /></label><div className="form-grid"><label>Fecha límite<input name="dueDate" type="date" defaultValue={editingTask?.dueDate?.slice(0, 10)} /></label><label>Prioridad<select name="priority" defaultValue={editingTask?.priority || 'medium'}><option value="high">Alta</option><option value="medium">Media</option><option value="low">Baja</option></select></label></div><label>Estado<select name="status" defaultValue={editingTask?.status || 'pending'}><option value="pending">Pendiente</option><option value="in-progress">En progreso</option><option value="completed">Completada</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setIsFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button">{editingTask ? 'Guardar' : 'Crear tarea'}</button></div></form></section></div>}
    </div>
  )
}

export default App
