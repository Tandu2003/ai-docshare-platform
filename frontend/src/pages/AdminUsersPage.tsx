import { Users, Filter, MoreHorizontal, Mail, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table'

interface User {
	id: string
	firstName: string
	lastName: string
	email: string
	role: {
		name: string
		permissions: string[]
	}
	status: 'active' | 'inactive' | 'suspended' | 'pending'
	emailVerified: boolean
	createdAt: string
	lastLoginAt?: string
	documentCount: number
	totalDownloads: number
	profile: {
		bio?: string
		location?: string
		website?: string
	}
}

export default function AdminUsersPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [statusFilter, setStatusFilter] = useState('all')
	const [roleFilter, setRoleFilter] = useState('all')
	const [isLoading] = useState(false)

	// Mock users data - replace with actual API call
	const users: User[] = [
		{
			id: '1',
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			role: { name: 'admin', permissions: ['read', 'write', 'delete', 'admin'] },
			status: 'active',
			emailVerified: true,
			createdAt: '2024-01-15T10:30:00Z',
			lastLoginAt: '2024-01-20T14:22:00Z',
			documentCount: 12,
			totalDownloads: 1250,
			profile: {
				bio: 'Full-stack developer with 5+ years experience',
				location: 'San Francisco, CA',
				website: 'https://johndoe.dev',
			},
		},
		{
			id: '2',
			firstName: 'Jane',
			lastName: 'Smith',
			email: 'jane.smith@example.com',
			role: { name: 'moderator', permissions: ['read', 'write', 'moderate'] },
			status: 'active',
			emailVerified: true,
			createdAt: '2024-01-10T09:15:00Z',
			lastLoginAt: '2024-01-19T16:45:00Z',
			documentCount: 8,
			totalDownloads: 890,
			profile: {
				bio: 'Data scientist and ML engineer',
				location: 'New York, NY',
			},
		},
		{
			id: '3',
			firstName: 'Mike',
			lastName: 'Johnson',
			email: 'mike.johnson@example.com',
			role: { name: 'user', permissions: ['read', 'write'] },
			status: 'active',
			emailVerified: true,
			createdAt: '2024-01-12T11:20:00Z',
			lastLoginAt: '2024-01-18T09:30:00Z',
			documentCount: 5,
			totalDownloads: 756,
			profile: {
				bio: 'Frontend developer specializing in React',
				location: 'Austin, TX',
			},
		},
		{
			id: '4',
			firstName: 'Sarah',
			lastName: 'Wilson',
			email: 'sarah.wilson@example.com',
			role: { name: 'user', permissions: ['read', 'write'] },
			status: 'pending',
			emailVerified: false,
			createdAt: '2024-01-08T14:45:00Z',
			documentCount: 0,
			totalDownloads: 0,
			profile: {},
		},
		{
			id: '5',
			firstName: 'Alex',
			lastName: 'Brown',
			email: 'alex.brown@example.com',
			role: { name: 'user', permissions: ['read', 'write'] },
			status: 'suspended',
			emailVerified: true,
			createdAt: '2024-01-05T16:30:00Z',
			lastLoginAt: '2024-01-16T10:20:00Z',
			documentCount: 3,
			totalDownloads: 523,
			profile: {
				bio: 'DevOps engineer',
				location: 'Seattle, WA',
			},
		},
	]

	const filteredUsers = users.filter(user => {
		const matchesSearch = 
			user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			user.email.toLowerCase().includes(searchQuery.toLowerCase())
		
		const matchesStatus = statusFilter === 'all' || user.status === statusFilter
		const matchesRole = roleFilter === 'all' || user.role.name === roleFilter

		return matchesSearch && matchesStatus && matchesRole
	})

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'active':
				return <Badge className="bg-green-500 text-white">Active</Badge>
			case 'inactive':
				return <Badge variant="secondary">Inactive</Badge>
			case 'suspended':
				return <Badge className="bg-red-500 text-white">Suspended</Badge>
			case 'pending':
				return <Badge className="bg-yellow-500 text-white">Pending</Badge>
			default:
				return <Badge variant="outline">{status}</Badge>
		}
	}

	const getRoleBadge = (role: string) => {
		switch (role) {
			case 'admin':
				return <Badge className="bg-purple-500 text-white">Admin</Badge>
			case 'moderator':
				return <Badge className="bg-blue-500 text-white">Moderator</Badge>
			case 'user':
				return <Badge variant="outline">User</Badge>
			default:
				return <Badge variant="outline">{role}</Badge>
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'active':
				return <CheckCircle className="h-4 w-4 text-green-500" />
			case 'suspended':
				return <XCircle className="h-4 w-4 text-red-500" />
			case 'pending':
				return <AlertCircle className="h-4 w-4 text-yellow-500" />
			default:
				return <AlertCircle className="h-4 w-4 text-gray-500" />
		}
	}

	const handleUserAction = (userId: string, action: string) => {
		console.log(`Performing ${action} on user ${userId}`)
		// Implement user actions (activate, suspend, delete, etc.)
	}

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Users className="h-8 w-8 text-primary" />
						User Management
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage users, roles, and permissions
					</p>
				</div>
				<Button>
					<Users className="h-4 w-4 mr-2" />
					Add User
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Users</p>
								<p className="text-2xl font-bold">{users.length}</p>
							</div>
							<Users className="h-8 w-8 text-muted-foreground" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Active Users</p>
								<p className="text-2xl font-bold">
									{users.filter(u => u.status === 'active').length}
								</p>
							</div>
							<CheckCircle className="h-8 w-8 text-green-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Pending</p>
								<p className="text-2xl font-bold">
									{users.filter(u => u.status === 'pending').length}
								</p>
							</div>
							<AlertCircle className="h-8 w-8 text-yellow-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Suspended</p>
								<p className="text-2xl font-bold">
									{users.filter(u => u.status === 'suspended').length}
								</p>
							</div>
							<XCircle className="h-8 w-8 text-red-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filters
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4">
						<div className="flex-1">
							<Label htmlFor="search">Search Users</Label>
							<Input
								id="search"
								placeholder="Search by name or email..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full"
							/>
						</div>
						<div className="space-y-2">
							<Label>Status</Label>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="active">Active</SelectItem>
									<SelectItem value="inactive">Inactive</SelectItem>
									<SelectItem value="suspended">Suspended</SelectItem>
									<SelectItem value="pending">Pending</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Role</Label>
							<Select value={roleFilter} onValueChange={setRoleFilter}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="moderator">Moderator</SelectItem>
									<SelectItem value="user">User</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Users Table */}
			<Card>
				<CardHeader>
					<CardTitle>Users ({filteredUsers.length})</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="space-y-4">
							{Array.from({ length: 5 }).map((_, i) => (
								<div key={i} className="flex items-center space-x-4">
									<Skeleton className="h-10 w-10 rounded-full" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-[200px]" />
										<Skeleton className="h-4 w-[150px]" />
									</div>
								</div>
							))}
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Email Verified</TableHead>
									<TableHead>Documents</TableHead>
									<TableHead>Downloads</TableHead>
									<TableHead>Joined</TableHead>
									<TableHead className="w-[50px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredUsers.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<AvatarFallback className="text-xs">
														{user.firstName.charAt(0)}
														{user.lastName.charAt(0)}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="font-medium">
														{user.firstName} {user.lastName}
													</p>
													<p className="text-sm text-muted-foreground">
														{user.email}
													</p>
												</div>
											</div>
										</TableCell>
										<TableCell>
											{getRoleBadge(user.role.name)}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{getStatusIcon(user.status)}
												{getStatusBadge(user.status)}
											</div>
										</TableCell>
										<TableCell>
											{user.emailVerified ? (
												<CheckCircle className="h-4 w-4 text-green-500" />
											) : (
												<XCircle className="h-4 w-4 text-red-500" />
											)}
										</TableCell>
										<TableCell>
											<span className="font-medium">{user.documentCount}</span>
										</TableCell>
										<TableCell>
											<span className="font-medium">{user.totalDownloads}</span>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 text-sm text-muted-foreground">
												<Calendar className="h-3 w-3" />
												{new Date(user.createdAt).toLocaleDateString()}
											</div>
										</TableCell>
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuLabel>Actions</DropdownMenuLabel>
													<DropdownMenuSeparator />
													<DropdownMenuItem onClick={() => handleUserAction(user.id, 'view')}>
														View Profile
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => handleUserAction(user.id, 'edit')}>
														Edit User
													</DropdownMenuItem>
													<DropdownMenuItem onClick={() => handleUserAction(user.id, 'email')}>
														<Mail className="mr-2 h-4 w-4" />
														Send Email
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													{user.status === 'active' ? (
														<DropdownMenuItem 
															onClick={() => handleUserAction(user.id, 'suspend')}
															className="text-yellow-600"
														>
															Suspend User
														</DropdownMenuItem>
													) : (
														<DropdownMenuItem 
															onClick={() => handleUserAction(user.id, 'activate')}
															className="text-green-600"
														>
															Activate User
														</DropdownMenuItem>
													)}
													<DropdownMenuItem 
														onClick={() => handleUserAction(user.id, 'delete')}
														className="text-red-600"
													>
														Delete User
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}