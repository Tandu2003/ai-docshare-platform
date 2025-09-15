import { Search, Filter, SortAsc, SortDesc, FileText, Calendar, Download, Eye, Star } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Link } from 'react-router-dom'
import { getLanguageName, getLanguageOptions } from '@/utils/language'

interface SearchFilters {
	query: string
	categoryId?: string
	tags?: string[]
	language?: string
	isPublic?: boolean
	isPremium?: boolean
	isApproved?: boolean
	minRating?: number
	dateRange?: 'all' | 'week' | 'month' | 'year'
	sortBy?: 'recent' | 'rating' | 'downloads' | 'views' | 'title'
}

interface SearchResult {
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
	relevanceScore?: number
}

export default function SearchPage() {
	const [filters, setFilters] = useState<SearchFilters>({
		query: '',
		sortBy: 'recent',
		dateRange: 'all',
	})
	const [isExpanded, setIsExpanded] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [results, setResults] = useState<SearchResult[]>([])

	const languageOptions = getLanguageOptions()
	const popularTags = ['javascript', 'react', 'typescript', 'nodejs', 'python', 'ai', 'machine-learning', 'data-science']

	// Mock search results - replace with actual API call
	const mockResults: SearchResult[] = [
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
			relevanceScore: 0.95,
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
			relevanceScore: 0.87,
		},
	]

	const handleSearch = async () => {
		if (!filters.query.trim()) return

		setIsLoading(true)
		// Simulate API call
		setTimeout(() => {
			setResults(mockResults.filter(doc =>
				doc.title.toLowerCase().includes(filters.query.toLowerCase()) ||
				doc.description?.toLowerCase().includes(filters.query.toLowerCase()) ||
				doc.tags.some(tag => tag.toLowerCase().includes(filters.query.toLowerCase()))
			))
			setIsLoading(false)
		}, 1000)
	}

	const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
		setFilters(prev => ({ ...prev, ...newFilters }))
	}

	const handleTagToggle = (tag: string) => {
		const currentTags = filters.tags || []
		const newTags = currentTags.includes(tag)
			? currentTags.filter(t => t !== tag)
			: [...currentTags, tag]

		handleFilterChange({ tags: newTags.length > 0 ? newTags : undefined })
	}

	const activeFiltersCount = Object.values(filters).filter(value =>
		value !== undefined && value !== null &&
		(Array.isArray(value) ? value.length > 0 : true) &&
		value !== '' && value !== 'all' && value !== 'recent'
	).length

	return (
		<div className="container mx-auto px-4 py-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold flex items-center gap-2">
						<Search className="h-8 w-8 text-primary" />
						Advanced Search
					</h1>
					<p className="text-muted-foreground mt-1">
						Find documents with powerful search and filtering options
					</p>
				</div>
			</div>

			{/* Search Bar */}
			<Card>
				<CardContent className="p-6">
					<div className="flex gap-4">
						<div className="flex-1">
							<Input
								placeholder="Search documents, descriptions, tags..."
								value={filters.query}
								onChange={(e) => handleFilterChange({ query: e.target.value })}
								onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
								className="w-full"
							/>
						</div>
						<Button onClick={handleSearch} disabled={!filters.query.trim() || isLoading}>
							<Search className="h-4 w-4 mr-2" />
							{isLoading ? 'Searching...' : 'Search'}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Filters */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center gap-2">
							<Filter className="h-5 w-5" />
							Filters
							{activeFiltersCount > 0 && (
								<Badge variant="secondary" className="text-xs">
									{activeFiltersCount}
								</Badge>
							)}
						</CardTitle>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? 'Collapse' : 'Expand'} Filters
						</Button>
					</div>
				</CardHeader>
				<CardContent className={isExpanded ? 'space-y-6' : 'space-y-4'}>
					{/* Basic Filters */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-3">
							<Label className="text-sm font-medium">Language</Label>
							<Select value={filters.language || 'all'} onValueChange={(value) => handleFilterChange({ language: value === 'all' ? undefined : value })}>
								<SelectTrigger>
									<SelectValue placeholder="Select language" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Languages</SelectItem>
									{languageOptions.map((lang) => (
										<SelectItem key={lang.code} value={lang.code}>
											{lang.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-3">
							<Label className="text-sm font-medium">Date Range</Label>
							<Select value={filters.dateRange || 'all'} onValueChange={(value) => handleFilterChange({ dateRange: value as any })}>
								<SelectTrigger>
									<SelectValue placeholder="Select date range" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Time</SelectItem>
									<SelectItem value="week">Past Week</SelectItem>
									<SelectItem value="month">Past Month</SelectItem>
									<SelectItem value="year">Past Year</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-3">
							<Label className="text-sm font-medium">Sort By</Label>
							<Select value={filters.sortBy || 'recent'} onValueChange={(value) => handleFilterChange({ sortBy: value as any })}>
								<SelectTrigger>
									<SelectValue placeholder="Sort by" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="recent">Most Recent</SelectItem>
									<SelectItem value="rating">Highest Rated</SelectItem>
									<SelectItem value="downloads">Most Downloaded</SelectItem>
									<SelectItem value="views">Most Viewed</SelectItem>
									<SelectItem value="title">Title A-Z</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Expanded Filters */}
					{isExpanded && (
						<>
							<Separator />
							<div className="space-y-6">
								{/* Tags */}
								<div className="space-y-3">
									<Label className="text-sm font-medium">Tags</Label>
									<div className="flex flex-wrap gap-2">
										{popularTags.map((tag) => (
											<Badge
												key={tag}
												variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
												className="cursor-pointer hover:bg-primary/10"
												onClick={() => handleTagToggle(tag)}
											>
												{tag}
											</Badge>
										))}
									</div>
								</div>

								{/* Visibility */}
								<div className="space-y-3">
									<Label className="text-sm font-medium">Visibility</Label>
									<div className="flex items-center space-x-4">
										<div className="flex items-center space-x-2">
											<Checkbox
												id="public"
												checked={filters.isPublic === true}
												onCheckedChange={(checked) => handleFilterChange({ isPublic: checked ? true : undefined })}
											/>
											<Label htmlFor="public" className="text-sm">Public</Label>
										</div>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="premium"
												checked={filters.isPremium === true}
												onCheckedChange={(checked) => handleFilterChange({ isPremium: checked ? true : undefined })}
											/>
											<Label htmlFor="premium" className="text-sm">Premium</Label>
										</div>
									</div>
								</div>

								{/* Rating */}
								<div className="space-y-3">
									<Label className="text-sm font-medium">Minimum Rating: {filters.minRating || 0}</Label>
									<Slider
										value={[filters.minRating || 0]}
										onValueChange={(value) => handleFilterChange({ minRating: value[0] > 0 ? value[0] : undefined })}
										max={5}
										step={0.1}
										className="w-full"
									/>
								</div>
							</div>
						</>
					)}
				</CardContent>
			</Card>

			{/* Search Results */}
			{results.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold">Search Results</h2>
						<p className="text-sm text-muted-foreground">
							{results.length} document{results.length !== 1 ? 's' : ''} found
						</p>
					</div>

					<div className="space-y-4">
						{results.map((document) => (
							<Card key={document.id} className="hover:shadow-md transition-shadow">
								<CardContent className="p-6">
									<div className="flex items-start justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-2">
												<Link
													to={`/documents/${document.id}`}
													className="text-lg font-semibold hover:text-primary transition-colors"
												>
													{document.title}
												</Link>
												{document.isPremium && (
													<Badge variant="default" className="text-xs">Premium</Badge>
												)}
												{document.relevanceScore && (
													<Badge variant="outline" className="text-xs">
														{Math.round(document.relevanceScore * 100)}% match
													</Badge>
												)}
											</div>

											{document.description && (
												<p className="text-sm text-muted-foreground mb-3 line-clamp-2">
													{document.description}
												</p>
											)}

											{/* Author and Stats */}
											<div className="flex items-center gap-4 mb-3">
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
											<div className="flex items-center gap-2 mb-3">
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
											<div className="flex items-center gap-1 text-xs text-muted-foreground">
												<Calendar className="h-3 w-3" />
												<span>Created on {new Date(document.createdAt).toLocaleDateString()}</span>
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
				</div>
			)}

			{/* No Results */}
			{!isLoading && filters.query && results.length === 0 && (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Search className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-medium text-muted-foreground mb-2">
							No documents found
						</h3>
						<p className="text-sm text-muted-foreground text-center max-w-md">
							Try adjusting your search terms or filters to find more documents.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	)
}