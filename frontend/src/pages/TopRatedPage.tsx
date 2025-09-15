import { Star, Calendar, Download, Eye, Award, Trophy, Medal } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { getLanguageName } from '@/utils/language'

interface TopRatedDocument {
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
	ratingCount: number
	createdAt: string
	isPublic: boolean
	isPremium: boolean
	isApproved: boolean
	rank: number
}

export default function TopRatedPage() {
	const [timeRange, setTimeRange] = useState('all')
	const [minRatings, setMinRatings] = useState('10')
	const [isLoading] = useState(false)

	// Mock top rated data - replace with actual API call
	const topRatedDocuments: TopRatedDocument[] = [
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
			averageRating: 4.9,
			ratingCount: 156,
			createdAt: '2024-01-15T10:30:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
			rank: 1,
		},
		{
			id: '2',
			title: 'Complete Guide to TypeScript',
			description: 'Master TypeScript from basics to advanced concepts with practical examples.',
			language: 'en',
			category: { id: '1', name: 'Web Development', icon: '🌐' },
			tags: ['typescript', 'javascript', 'programming', 'web'],
			uploader: { firstName: 'Mike', lastName: 'Johnson' },
			downloadCount: 756,
			viewCount: 1890,
			averageRating: 4.8,
			ratingCount: 89,
			createdAt: '2024-01-12T11:20:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
			rank: 2,
		},
		{
			id: '3',
			title: 'Machine Learning Fundamentals',
			description: 'Introduction to machine learning concepts, algorithms, and practical applications.',
			language: 'en',
			category: { id: '2', name: 'Data Science', icon: '📊' },
			tags: ['machine-learning', 'python', 'ai', 'data-science'],
			uploader: { firstName: 'Jane', lastName: 'Smith' },
			downloadCount: 890,
			viewCount: 2100,
			averageRating: 4.7,
			ratingCount: 134,
			createdAt: '2024-01-10T09:15:00Z',
			isPublic: true,
			isPremium: true,
			isApproved: true,
			rank: 3,
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
			averageRating: 4.6,
			ratingCount: 78,
			createdAt: '2024-01-08T14:45:00Z',
			isPublic: true,
			isPremium: false,
			isApproved: true,
			rank: 4,
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
			averageRating: 4.5,
			ratingCount: 67,
			createdAt: '2024-01-05T16:30:00Z',
			isPublic: true,
			isPremium: true,
			isApproved: true,
			rank: 5,
		},
	]

	const getRankIcon = (rank: number) => {
		switch (rank) {
			case 1:
				return <Trophy className="h-5 w-5 text-yellow-500" />
			case 2:
				return <Medal className="h-5 w-5 text-gray-400" />
			case 3:
				return <Medal className="h-5 w-5 text-amber-600" />
			default:
				return <Award className="h-5 w-5 text-muted-foreground" />
		}
	}

	const getRankBadge = (rank: number) => {
		switch (rank) {
			case 1:
				return <Badge className="bg-yellow-500 text-white">🥇 #1</Badge>
			case 2:
				return <Badge className="bg-gray-400 text-white">🥈 #2</Badge>
			case 3:
				return <Badge className="bg-amber-600 text-white">🥉 #3</Badge>
			default:
				return <Badge variant="outline">#{rank}</Badge>
		}
	}

	const getRatingStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, i) => (
			<Star
				key={i}
				className={`h-4 w-4 ${
					i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
				}`}
			/>
		))
	}

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Star className="h-8 w-8 text-primary" />
						Top Rated Documents
					</h1>
					<p className="text-muted-foreground mt-1">
						The highest-rated documents based on user reviews
					</p>
				</div>
				<div className="flex gap-2">
					<Select value={timeRange} onValueChange={setTimeRange}>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Time</SelectItem>
							<SelectItem value="year">This Year</SelectItem>
							<SelectItem value="month">This Month</SelectItem>
							<SelectItem value="week">This Week</SelectItem>
						</SelectContent>
					</Select>
					<Select value={minRatings} onValueChange={setMinRatings}>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="5">5+ ratings</SelectItem>
							<SelectItem value="10">10+ ratings</SelectItem>
							<SelectItem value="25">25+ ratings</SelectItem>
							<SelectItem value="50">50+ ratings</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Top Rated Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Average Rating</p>
								<p className="text-2xl font-bold">
									{(topRatedDocuments.reduce((acc, doc) => acc + doc.averageRating, 0) / topRatedDocuments.length).toFixed(1)}
								</p>
							</div>
							<Star className="h-8 w-8 text-yellow-500" />
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							Across all top documents
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Ratings</p>
								<p className="text-2xl font-bold">
									{topRatedDocuments.reduce((acc, doc) => acc + doc.ratingCount, 0)}
								</p>
							</div>
							<Award className="h-8 w-8 text-blue-500" />
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							User reviews collected
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Perfect Scores</p>
								<p className="text-2xl font-bold">
									{topRatedDocuments.filter(doc => doc.averageRating >= 4.8).length}
								</p>
							</div>
							<Trophy className="h-8 w-8 text-yellow-500" />
						</div>
						<p className="text-sm text-muted-foreground mt-1">
							Documents with 4.8+ rating
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Top Rated Documents */}
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
					{topRatedDocuments.map((document) => (
						<Card key={document.id} className="hover:shadow-md transition-shadow">
							<CardContent className="p-6">
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-3 mb-2">
											<div className="flex items-center gap-2">
												{getRankIcon(document.rank)}
												<span className="text-2xl font-bold text-primary w-8">
													#{document.rank}
												</span>
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<Link
														to={`/documents/${document.id}`}
														className="text-lg font-semibold hover:text-primary transition-colors"
													>
														{document.title}
													</Link>
													{getRankBadge(document.rank)}
													{document.isPremium && (
														<Badge variant="default" className="text-xs">Premium</Badge>
													)}
												</div>
												<div className="flex items-center gap-2">
													<div className="flex items-center gap-1">
														{getRatingStars(document.averageRating)}
													</div>
													<span className="text-sm font-medium">
														{document.averageRating.toFixed(1)}
													</span>
													<span className="text-sm text-muted-foreground">
														({document.ratingCount} ratings)
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

										{/* Date */}
										<div className="flex items-center gap-1 text-xs text-muted-foreground ml-11">
											<Calendar className="h-3 w-3" />
											<span>Created {new Date(document.createdAt).toLocaleDateString()}</span>
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
					Load More Top Rated Documents
				</Button>
			</div>
		</div>
	)
}