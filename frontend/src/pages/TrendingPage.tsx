import { TrendingUp, Calendar, Download, Eye, Star, Clock, Flame } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { getLanguageName } from '@/utils/language'

interface TrendingDocument {
	id: string
	title: string
	description?: string
	language: string
	category: {
		id: string
		name: string
		icon: string
	}
	tags: string[]
	uploader: {
		firstName: string
		lastName: string
	}
	downloadCount: number
	viewCount: number
	averageRating: number
	createdAt: string
	isPublic: boolean
	isPremium: boolean
	isApproved: boolean
	trendingScore: number
	trendingChange: number
	lastUpdated: string
}

export default function TrendingPage() {
	const [timeRange, setTimeRange] = useState('week')
	const [isLoading] = useState(false)

	// Mock trending data - replace with actual API call
	const trendingDocuments: TrendingDocument[] = [
		{
			id: '1',
			title: 'Advanced React Patterns and Best Practices',
			description: 'Comprehensive guide to advanced React patterns including hooks, context, and performance optimization.',
			language: 'en',
			category: { id: '1', name: 'Web Development', icon: '🌐' },
			tags: ['react', 'javascript', 'frontend', 'patterns'],
			uploader: { firstName: 'John', lastName: 'Doe' },
			downloadCount: 1250,
			viewCount: 3200,
			averageRating: 4.8,
			createdAt: '2024-01-15T10:30:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
			trendingScore: 95,
			trendingChange: 25.3,
			lastUpdated: '2024-01-20T14:22:00Z',
		},
		{
			id: '2',
			title: 'Machine Learning Fundamentals',
			description: 'Introduction to machine learning concepts, algorithms, and practical applications.',
			language: 'en',
			category: { id: '2', name: 'Data Science', icon: '📊' },
			tags: ['machine-learning', 'python', 'ai', 'data-science'],
			uploader: { firstName: 'Jane', lastName: 'Smith' },
			downloadCount: 890,
			viewCount: 2100,
			averageRating: 4.6,
			createdAt: '2024-01-10T09:15:00Z',
			isPublic: true,
			isPremium: true,
			isApproved: true,
			trendingScore: 87,
			trendingChange: 18.7,
			lastUpdated: '2024-01-19T16:45:00Z',
		},
		{
			id: '3',
			title: 'Complete Guide to TypeScript',
			description: 'Master TypeScript from basics to advanced concepts with practical examples.',
			language: 'en',
			category: { id: '1', name: 'Web Development', icon: '🌐' },
			tags: ['typescript', 'javascript', 'programming', 'web'],
			uploader: { firstName: 'Mike', lastName: 'Johnson' },
			downloadCount: 756,
			viewCount: 1890,
			averageRating: 4.7,
			createdAt: '2024-01-12T11:20:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
			trendingScore: 82,
			trendingChange: 15.2,
			lastUpdated: '2024-01-18T09:30:00Z',
		},
		{
			id: '4',
			title: 'Python Data Analysis with Pandas',
			description: 'Learn data analysis techniques using Python and Pandas library.',
			language: 'en',
			category: { id: '2', name: 'Data Science', icon: '📊' },
			tags: ['python', 'pandas', 'data-analysis', 'statistics'],
			uploader: { firstName: 'Sarah', lastName: 'Wilson' },
			downloadCount: 634,
			viewCount: 1567,
			averageRating: 4.5,
			createdAt: '2024-01-08T14:45:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
			trendingScore: 78,
			trendingChange: 12.8,
			lastUpdated: '2024-01-17T12:15:00Z',
		},
		{
			id: '5',
			title: 'Docker Containerization Guide',
			description: 'Complete guide to Docker containers, images, and orchestration.',
			language: 'en',
			category: { id: '3', name: 'DevOps', icon: '⚙️' },
			tags: ['docker', 'containers', 'devops', 'deployment'],
			uploader: { firstName: 'Alex', lastName: 'Brown' },
			downloadCount: 523,
			viewCount: 1345,
			averageRating: 4.4,
			createdAt: '2024-01-05T16:30:00Z',
			isPublic: true,
			isPremium: true,
			isApproved: true,
			trendingScore: 74,
			trendingChange: 9.6,
			lastUpdated: '2024-01-16T10:20:00Z',
		},
	]

	const getTrendingBadge = (score: number) => {
		if (score >= 90) return <Badge className="bg-red-500 text-white">🔥 Hot</Badge>
		if (score >= 80) return <Badge className="bg-orange-500 text-white">📈 Rising</Badge>
		if (score >= 70) return <Badge className="bg-yellow-500 text-white">⭐ Trending</Badge>
		return <Badge variant="outline">📊 Popular</Badge>
	}

	const getTrendingIcon = (change: number) => {
		if (change > 20) return <Flame className="h-4 w-4 text-red-500" />
		if (change > 10) return <TrendingUp className="h-4 w-4 text-orange-500" />
		return <TrendingUp className="h-4 w-4 text-green-500" />
	}

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<TrendingUp className="h-8 w-8 text-primary" />
						Trending Documents
					</h1>
					<p className="text-muted-foreground mt-1">
						Discover the most popular and fast-growing documents
					</p>
				</div>
				<Select value={timeRange} onValueChange={setTimeRange}>
					<SelectTrigger className="w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="day">Today</SelectItem>
						<SelectItem value="week">This Week</SelectItem>
						<SelectItem value="month">This Month</SelectItem>
						<SelectItem value="year">This Year</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Trending Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Trending</p>
								<p className="text-2xl font-bold">{trendingDocuments.length}</p>
							</div>
							<Flame className="h-8 w-8 text-red-500" />
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							Documents gaining momentum
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Avg. Growth</p>
								<p className="text-2xl font-bold">
									{Math.round(trendingDocuments.reduce((acc, doc) => acc + doc.trendingChange, 0) / trendingDocuments.length)}%
								</p>
							</div>
							<TrendingUp className="h-8 w-8 text-green-500" />
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							Average trending change
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Hot Documents</p>
								<p className="text-2xl font-bold">
									{trendingDocuments.filter(doc => doc.trendingScore >= 90).length}
								</p>
							</div>
							<Star className="h-8 w-8 text-yellow-500" />
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							Documents with 90+ score
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Trending Documents */}
			{isLoading ? (
				<div className="space-y-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="space-y-3">
									<Skeleton className="h-6 w-3/4" />
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-1/2" />
									<div className="flex gap-2">
										<Skeleton className="h-6 w-16" />
										<Skeleton className="h-6 w-20" />
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<div className="space-y-4">
					{trendingDocuments.map((document, index) => (
						<Card key={document.id} className="hover:shadow-md transition-shadow">
							<CardContent className="p-6">
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-3 mb-2">
											<span className="text-2xl font-bold text-primary w-8">
												#{index + 1}
											</span>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<Link
														to={`/documents/${document.id}`}
														className="text-lg font-semibold hover:text-primary transition-colors"
													>
														{document.title}
													</Link>
													{getTrendingBadge(document.trendingScore)}
													{document.isPremium && (
														<Badge variant="default" className="text-xs">Premium</Badge>
													)}
												</div>
												<div className="flex items-center gap-2">
													{getTrendingIcon(document.trendingChange)}
													<span className="text-sm font-medium text-green-600">
														+{document.trendingChange.toFixed(1)}%
													</span>
													<span className="text-sm text-muted-foreground">
														trending this {timeRange}
													</span>
												</div>
											</div>
										</div>

										{document.description && (
											<p className="text-sm text-muted-foreground mb-3 line-clamp-2 ml-11">
												{document.description}
											</p>
										)}

										{/* Author and Stats */}
										<div className="flex items-center gap-4 mb-3 ml-11">
											<div className="flex items-center gap-2">
												<Avatar className="h-6 w-6">
													<AvatarFallback className="text-xs">
														{document.uploader.firstName.charAt(0)}
														{document.uploader.lastName.charAt(0)}
													</AvatarFallback>
												</Avatar>
												<span className="text-sm text-muted-foreground">
													{document.uploader.firstName} {document.uploader.lastName}
												</span>
											</div>
											<Separator orientation="vertical" className="h-4" />
											<div className="flex items-center gap-4 text-sm text-muted-foreground">
												<div className="flex items-center gap-1">
													<Download className="h-3 w-3" />
													<span>{document.downloadCount}</span>
												</div>
												<div className="flex items-center gap-1">
													<Eye className="h-3 w-3" />
													<span>{document.viewCount}</span>
												</div>
												<div className="flex items-center gap-1">
													<Star className="h-3 w-3" />
													<span>{document.averageRating.toFixed(1)}</span>
												</div>
											</div>
										</div>

										{/* Category and Tags */}
										<div className="flex items-center gap-2 mb-3 ml-11">
											<Badge variant="secondary" className="text-xs">
												<span className="mr-1">{document.category.icon}</span>
												{document.category.name}
											</Badge>
											<Badge variant="outline" className="text-xs">
												{getLanguageName(document.language)}
											</Badge>
											{document.tags.slice(0, 3).map((tag) => (
												<Badge key={tag} variant="outline" className="text-xs">
													{tag}
												</Badge>
											))}
											{document.tags.length > 3 && (
												<Badge variant="outline" className="text-xs">
													+{document.tags.length - 3} more
												</Badge>
											)}
										</div>

										{/* Dates */}
										<div className="flex items-center gap-4 text-xs text-muted-foreground ml-11">
											<div className="flex items-center gap-1">
												<Calendar className="h-3 w-3" />
												<span>Created {new Date(document.createdAt).toLocaleDateString()}</span>
											</div>
											<div className="flex items-center gap-1">
												<Clock className="h-3 w-3" />
												<span>Updated {new Date(document.lastUpdated).toLocaleDateString()}</span>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2 ml-4">
										<Button variant="outline" size="sm" asChild>
											<Link to={`/documents/${document.id}`}>
												View Document
											</Link>
										</Button>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{/* Load More */}
			<div className="flex justify-center">
				<Button variant="outline">
					Load More Trending Documents
				</Button>
			</div>
		</div>
	)
}