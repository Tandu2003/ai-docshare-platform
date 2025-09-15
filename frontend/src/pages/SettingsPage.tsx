import { Settings, User, Bell, Shield, Palette, Globe, Save, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks'

interface UserSettings {
	firstName: string
	lastName: string
	email: string
	bio?: string
	website?: string
	location?: string
	language: string
	timezone: string
	theme: 'light' | 'dark' | 'system'
	emailNotifications: boolean
	pushNotifications: boolean
	marketingEmails: boolean
	profileVisibility: 'public' | 'private' | 'friends'
	showEmail: boolean
	showLocation: boolean
}

export default function SettingsPage() {
	const { user } = useAuth()
	const [settings, setSettings] = useState<UserSettings>({
		firstName: user?.firstName || '',
		lastName: user?.lastName || '',
		email: user?.email || '',
		bio: '',
		website: '',
		location: '',
		language: 'en',
		timezone: 'UTC',
		theme: 'system',
		emailNotifications: true,
		pushNotifications: true,
		marketingEmails: false,
		profileVisibility: 'public',
		showEmail: false,
		showLocation: true,
	})
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	const handleSave = async () => {
		setIsLoading(true)
		// Simulate API call
		setTimeout(() => {
			setIsLoading(false)
			// Show success message
		}, 1000)
	}

	const handleSettingChange = (key: keyof UserSettings, value: any) => {
		setSettings(prev => ({ ...prev, [key]: value }))
	}

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Settings className="h-8 w-8 text-primary" />
						Settings
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage your account settings and preferences
					</p>
				</div>
				<Button onClick={handleSave} disabled={isLoading}>
					<Save className="h-4 w-4 mr-2" />
					{isLoading ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Profile Settings */}
				<div className="lg:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								Profile Information
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-4">
								<Avatar className="h-16 w-16">
									<AvatarFallback className="text-lg">
										{settings.firstName.charAt(0)}
										{settings.lastName.charAt(0)}
									</AvatarFallback>
								</Avatar>
								<div>
									<Button variant="outline" size="sm">
										Change Avatar
									</Button>
									<p className="text-xs text-muted-foreground mt-1">
										JPG, PNG or GIF. Max size 2MB.
									</p>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="firstName">First Name</Label>
									<Input
										id="firstName"
										value={settings.firstName}
										onChange={(e) => handleSettingChange('firstName', e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="lastName">Last Name</Label>
									<Input
										id="lastName"
										value={settings.lastName}
										onChange={(e) => handleSettingChange('lastName', e.target.value)}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email Address</Label>
								<Input
									id="email"
									type="email"
									value={settings.email}
									onChange={(e) => handleSettingChange('email', e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="bio">Bio</Label>
								<Input
									id="bio"
									placeholder="Tell us about yourself..."
									value={settings.bio}
									onChange={(e) => handleSettingChange('bio', e.target.value)}
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="website">Website</Label>
									<Input
										id="website"
										placeholder="https://yourwebsite.com"
										value={settings.website}
										onChange={(e) => handleSettingChange('website', e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="location">Location</Label>
									<Input
										id="location"
										placeholder="City, Country"
										value={settings.location}
										onChange={(e) => handleSettingChange('location', e.target.value)}
									/>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Bell className="h-5 w-5" />
								Notifications
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Email Notifications</Label>
									<p className="text-sm text-muted-foreground">
										Receive email notifications for important updates
									</p>
								</div>
								<Switch
									checked={settings.emailNotifications}
									onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
								/>
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Push Notifications</Label>
									<p className="text-sm text-muted-foreground">
										Receive push notifications in your browser
									</p>
								</div>
								<Switch
									checked={settings.pushNotifications}
									onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
								/>
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Marketing Emails</Label>
									<p className="text-sm text-muted-foreground">
										Receive emails about new features and promotions
									</p>
								</div>
								<Switch
									checked={settings.marketingEmails}
									onCheckedChange={(checked) => handleSettingChange('marketingEmails', checked)}
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Shield className="h-5 w-5" />
								Privacy & Security
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Profile Visibility</Label>
								<Select value={settings.profileVisibility} onValueChange={(value) => handleSettingChange('profileVisibility', value)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="public">Public</SelectItem>
										<SelectItem value="private">Private</SelectItem>
										<SelectItem value="friends">Friends Only</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Show Email Address</Label>
									<p className="text-sm text-muted-foreground">
										Allow others to see your email address
									</p>
								</div>
								<Switch
									checked={settings.showEmail}
									onCheckedChange={(checked) => handleSettingChange('showEmail', checked)}
								/>
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Show Location</Label>
									<p className="text-sm text-muted-foreground">
										Allow others to see your location
									</p>
								</div>
								<Switch
									checked={settings.showLocation}
									onCheckedChange={(checked) => handleSettingChange('showLocation', checked)}
								/>
							</div>

							<Separator />

							<div className="space-y-2">
								<Label>Change Password</Label>
								<div className="space-y-2">
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="Current password"
									/>
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="New password"
									/>
									<Input
										type={showPassword ? 'text' : 'password'}
										placeholder="Confirm new password"
									/>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowPassword(!showPassword)}
									>
										{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
										{showPassword ? 'Hide' : 'Show'} passwords
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Preferences Sidebar */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Palette className="h-5 w-5" />
								Preferences
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label>Language</Label>
								<Select value={settings.language} onValueChange={(value) => handleSettingChange('language', value)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="en">English</SelectItem>
										<SelectItem value="vi">Vietnamese</SelectItem>
										<SelectItem value="es">Spanish</SelectItem>
										<SelectItem value="fr">French</SelectItem>
										<SelectItem value="de">German</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Theme</Label>
								<Select value={settings.theme} onValueChange={(value) => handleSettingChange('theme', value)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="light">Light</SelectItem>
										<SelectItem value="dark">Dark</SelectItem>
										<SelectItem value="system">System</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label>Timezone</Label>
								<Select value={settings.timezone} onValueChange={(value) => handleSettingChange('timezone', value)}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="UTC">UTC</SelectItem>
										<SelectItem value="America/New_York">Eastern Time</SelectItem>
										<SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
										<SelectItem value="Europe/London">London</SelectItem>
										<SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Globe className="h-5 w-5" />
								Account Status
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm">Email Verified</span>
								<Badge variant="default">Verified</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">Account Status</span>
								<Badge variant="default">Active</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">Member Since</span>
								<span className="text-sm text-muted-foreground">
									{new Date().toLocaleDateString()}
								</span>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Danger Zone</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<Button variant="destructive" className="w-full">
								Delete Account
							</Button>
							<p className="text-xs text-muted-foreground">
								This action cannot be undone. All your data will be permanently deleted.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}