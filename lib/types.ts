export type Role = 'admin_lead' | 'department_head' | 'worker' | 'pastor'
export type TaskStatus = 'Assigned' | 'In Progress' | 'Done' | 'Confirmed'

export interface Church {
  id: string
  name: string
  created_at: string
}

export interface Department {
  id: string
  church_id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  church_id: string | null
  department_id: string | null
  name: string
  email: string
  role: Role
  created_at: string
}

export interface Task {
  id: string
  church_id: string
  department_id: string
  title: string
  description: string | null
  assignee_id: string | null
  due_date: string | null
  status: TaskStatus
  created_at: string
  updated_at: string
  assignee?: Profile
  department?: Department
}
