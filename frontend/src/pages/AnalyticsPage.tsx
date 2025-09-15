import { BarChart3, TrendingUp, Users, Download, Eye, Star, Calendar, FileText } from 'lucide-react'
import { useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { getLanguageName } from '@/utils/language'

interface AnalyticsData {
	totalDocuments: number
	totalDownloads: number
	totalViews: number
	averageRating: number
	monthlyGrowth: number
	topCategories: Array<{
		name: string
		icon: string
		count: number
		percentage: number
	}>
	topLanguages: Array<{
		code: string
		count: number
		percentage: number
	}>
	topDocuments: Array<{
		id: string
		title: string
		downloads: number
		views: number
		rating: number
		category: string
		language: string
	}>
	monthlyStats: Array<{
		month: string
		downloads: number
		views: number
		documents: number
	}>
	userStats: {
		totalUsers: number
		activeUsers: number
		newUsers: number
		userGrowth: number
	}
}

export default function AnalyticsPage() {
	const [timeRange, setTimeRange] = useState('30d')
	const [isLoading] = useState(false)

	// Mock analytics data - replace with actual API call
	const analyticsData: AnalyticsData = {
		totalDocuments: 1247,
		totalDownloads: 45632,
		totalViews: 128934,
		averageRating: 4.2,
		monthlyGrowth: 12.5,
		topCategories: [
			{ name: 'Web Development', icon: '🌐', count: 342, percentage: 27.4 },
			{ name: 'Data Science', icon: '📊', count: 298, percentage: 23.9 },
			{ name: 'Mobile Development', icon: '📱', count: 187, percentage: 15.0 },
			{ name: 'AI & Machine Learning', icon: '🤖', count: 156, percentage: 12.5 },
			{ name: 'DevOps', icon: '⚙️', count: 134, percentage: 10.7 },
			{ name: 'Design', icon: '🎨', count: 130, percentage: 10.4 },
		],
		topLanguages: [
			{ code: 'en', count: 567, percentage: 45.5 },
			{ code: 'vi', count: 234, percentage: 18.8 },
			{ code: 'es', count: 156, percentage: 12.5 },
			{ code: 'fr', count: 134, percentage: 10.7 },
			{ code: 'de', count: 98, percentage: 7.9 },
			{ code: 'zh', count: 58, percentage: 4.7 },
		],
		topDocuments: [
			{
				id: '1',
				title: 'Advanced React Patterns and Best Practices',
				downloads: 1250,
				views: 3200,
				rating: 4.8,
				category: 'Web Development',
				language: 'en',
			},
			{
				id: '2',
				title: 'Machine Learning Fundamentals',
				downloads: 890,
				views: 2100,
				rating: 4.6,
				category: 'Data Science',
				language: 'en',
			},
			{
				id: '3',
				title: 'Complete Guide to TypeScript',
				downloads: 756,
				views: 1890,
				rating: 4.7,
				category: 'Web Development',
				language: 'en',
			},
		],
		monthlyStats: [
			{ month: 'Jan', downloads: 3200, views: 8900, documents: 45 },
			{ month: 'Feb', downloads: 3800, views: 10200, documents: 52 },
			{ month: 'Mar', downloads: 4200, views: 11500, documents: 58 },
			{ month: 'Apr', downloads: 4800, views: 12800, documents: 64 },
			{ month: 'May', downloads: 5200, views: 14200, documents: 71 },
			{ month: 'Jun', downloads: 5800, views: 15600, documents: 78 },
		],
		userStats: {
			totalUsers: 15420,
			activeUsers: 8934,
			newUsers: 234,
			userGrowth: 8.2,
		},
	}

	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
		return num.toString()
	}

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<BarChart3 className="h-8 w-8 text-primary" />
						Analytics Dashboard
					</h1>
					<p className="text-muted-foreground mt-1">
						Platform insights and performance metrics
					</p>
				</div>
				<Select value={timeRange} onValueChange={setTimeRange}>
					<SelectTrigger className="w-32">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="7d">Last 7 days</SelectItem>
						<SelectItem value="30d">Last 30 days</SelectItem>
						<SelectItem value="90d">Last 90 days</SelectItem>
						<SelectItem value="1y">Last year</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Documents</p>
								<p className="text-2xl font-bold">{formatNumber(analyticsData.totalDocuments)}</p>
							</div>
							<FileText className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="flex items-center mt-2">
							<TrendingUp className="h-4 w-4 text-green-500 mr-1" />
							<span className="text-sm text-green-500">+{analyticsData.monthlyGrowth}%</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
								<p className="text-2xl font-bold">{formatNumber(analyticsData.totalDownloads)}</p>
							</div>
							<Download className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="flex items-center mt-2">
							<TrendingUp className="h-4 w-4 text-green-500 mr-1" />
							<span className="text-sm text-green-500">+15.2%</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Views</p>
								<p className="text-2xl font-bold">{formatNumber(analyticsData.totalViews)}</p>
							</div>
							<Eye className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="flex items-center mt-2">
							<TrendingUp className="h-4 w-4 text-green-500 mr-1" />
							<span className="text-sm text-green-500">+22.8%</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Average Rating</p>
								<p className="text-2xl font-bold">{analyticsData.averageRating.toFixed(1)}</p>
							</div>
							<Star className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="flex items-center mt-2">
							<TrendingUp className="h-4 w-4 text-green-500 mr-1" />
							<span className="text-sm text-green-500">+0.3</span>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* User Statistics */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Users</p>
								<p className="text-2xl font-bold">{formatNumber(analyticsData.userStats.totalUsers)}</p>
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
								<p className="text-2xl font-bold">{formatNumber(analyticsData.userStats.activeUsers)}</p>
							</div>
							<Users className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="mt-2">
							<Progress value={(analyticsData.userStats.activeUsers / analyticsData.userStats.totalUsers) * 100} className="h-2" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">New Users</p>
								<p className="text-2xl font-bold">{analyticsData.userStats.newUsers}</p>
							</div>
							<Users className="h-8 w-8 text-muted-foreground" />
						</div>
						<div className="flex items-center mt-2">
							<TrendingUp className="h-4 w-4 text-green-500 mr-1" />
							<span className="text-sm text-green-500">+{analyticsData.userStats.userGrowth}%</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">User Growth</p>
								<p className="text-2xl font-bold">+{analyticsData.userStats.userGrowth}%</p>
							</div>
							<TrendingUp className="h-8 w-8 text-muted-foreground" />
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Top Categories */}
				<Card>
					<CardHeader>
						<CardTitle>Top Categories</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{analyticsData.topCategories.map((category, index) => (
								<div key={category.name} className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<span className="text-sm font-medium text-muted-foreground w-6">
											#{index + 1}
										</span>
										<span className="text-lg">{category.icon}</span>
										<div>
											<p className="font-medium">{category.name}</p>
											<p className="text-sm text-muted-foreground">
												{category.count} documents
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="font-medium">{category.percentage}%</p>
										<Progress value={category.percentage} className="w-20 h-2 mt-1" />
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Top Languages */}
				<Card>
					<CardHeader>
						<CardTitle>Top Languages</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{analyticsData.topLanguages.map((language, index) => (
								<div key={language.code} className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<span className="text-sm font-medium text-muted-foreground w-6">
											#{index + 1}
										</span>
										<div>
											<p className="font-medium">{getLanguageName(language.code)}</p>
											<p className="text-sm text-muted-foreground">
												{language.count} documents
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="font-medium">{language.percentage}%</p>
										<Progress value={language.percentage} className="w-20 h-2 mt-1" />
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Top Documents */}
			<Card>
				<CardHeader>
					<CardTitle>Top Performing Documents</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{analyticsData.topDocuments.map((document, index) => (
							<div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
								<div className="flex items-center gap-4">
									<span className="text-lg font-bold text-primary w-8">
										#{index + 1}
									</span>
									<div className="flex-1">
										<Link
											to={`/documents/${document.id}`}
											className="font-medium hover:text-primary transition-colors"
										>
											{document.title}
										</Link>
										<div className="flex items-center gap-2 mt-1">
											<Badge variant="outline" className="text-xs">
												{document.category}
											</Badge>
											<Badge variant="outline" className="text-xs">
												{getLanguageName(document.language)}
											</Badge>
										</div>
									</div>
								</div>
								<div className="flex items-center gap-6 text-sm text-muted-foreground">
									<div className="flex items-center gap-1">
										<Download className="h-4 w-4" />
										<span>{formatNumber(document.downloads)}</span>
									</div>
									<div className="flex items-center gap-1">
										<Eye className="h-4 w-4" />
										<span>{formatNumber(document.views)}</span>
									</div>
									<div className="flex items-center gap-1">
										<Star className="h-4 w-4" />
										<span>{document.rating.toFixed(1)}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Monthly Trends */}
			<Card>
				<CardHeader>
					<CardTitle>Monthly Trends</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{analyticsData.monthlyStats.map((stat) => (
							<div key={stat.month} className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<div className="w-12 text-center">
										<p className="font-medium">{stat.month}</p>
									</div>
									<div className="flex-1 grid grid-cols-3 gap-4">
										<div className="text-center">
											<p className="text-sm text-muted-foreground">Downloads</p>
											<p className="font-medium">{formatNumber(stat.downloads)}</p>
										</div>
										<div className="text-center">
											<p className="text-sm text-muted-foreground">Views</p>
											<p className="font-medium">{formatNumber(stat.views)}</p>
										</div>
										<div className="text-center">
											<p className="text-sm text-muted-foreground">Documents</p>
											<p className="font-medium">{stat.documents}</p>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}