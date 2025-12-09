const { faker } = require('@faker-js/faker')
const fs = require('fs')
const fsPromises = require('fs').promises
const path = require('path')
const axios = require('axios')
const FormData = require('form-data')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// Cấu hình
const API_BASE_URL = 'http://localhost:7777'
const SEED_DIR = path.join(__dirname, '../prisma/seed')
const DEFAULT_PASSWORD = 'Password123!'
const AI_TIMEOUT = parseInt(process.env.AI_TIMEOUT || '180000', 10) // 3 phút mặc định
const SKIP_AI = process.env.SKIP_AI === 'true' // Skip AI analysis nếu cần

// Prisma client sẽ được khởi tạo trong async function
let prisma = null

// Tạo user ngẫu nhiên
function createRandomUser() {
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const baseUsername = `${firstName}_${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
  const randomSuffix = faker.string.alphanumeric(5).toLowerCase()
  const username = `${baseUsername}_${randomSuffix}`.substring(0, 30)

  return {
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    username,
    password: DEFAULT_PASSWORD,
    firstName,
    lastName,
  }
}

// Lấy danh sách file từ thư mục seed
async function getSeedFiles() {
  try {
    const files = await fsPromises.readdir(SEED_DIR)
    return files
      .filter(file => !file.startsWith('.'))
      .map(file => path.join(SEED_DIR, file))
  } catch (error) {
    console.error('Error reading seed directory:', error)
    return []
  }
}

// Đăng ký user
async function registerUser(userData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData)
    return response.data
  } catch (error) {
    const errorMessage = error.response
      ? `HTTP ${error.response.status}: ${error.response.data?.message || JSON.stringify(error.response.data)}`
      : error.message
    throw new Error(`Register failed: ${errorMessage}`)
  }
}

// Lấy verification token từ database
async function getVerificationToken(email) {
  if (!prisma) throw new Error('Prisma client not initialized')

  const user = await prisma.user.findUnique({
    where: { email },
    select: { resetToken: true, resetExpires: true },
  })

  if (!user?.resetToken) return null
  if (user.resetExpires && user.resetExpires < new Date()) return null

  return user.resetToken
}

// Verify email
async function verifyEmail(token) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/verify-email`, { token })
    return response.data
  } catch (error) {
    throw new Error(`Verify email failed: ${error.response?.data?.message || error.message}`)
  }
}

// Đăng nhập để lấy JWT token
async function loginUser(email, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      emailOrUsername: email,
      password,
    })

    const loginData = response.data.data
    if (!loginData?.accessToken) {
      throw new Error(`Invalid login response: ${JSON.stringify(response.data)}`)
    }

    return loginData
  } catch (error) {
    const errorMessage = error.response
      ? `HTTP ${error.response.status}: ${error.response.data?.message || error.message}`
      : error.message
    throw new Error(`Login failed: ${errorMessage}`)
  }
}

// Step 1: Upload files (giống frontend FilesService.uploadFiles)
async function uploadFiles(filePaths, authToken) {
  try {
    const formData = new FormData()
    for (const filePath of filePaths) {
      formData.append('files', fs.createReadStream(filePath))
    }

    const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    })

    // Response: { success: true, data: FileUploadResult[] }
    const uploadData = response.data.data
    if (Array.isArray(uploadData)) return uploadData
    if (uploadData?.data && Array.isArray(uploadData.data)) return uploadData.data

    throw new Error(`Unexpected upload response: ${JSON.stringify(uploadData)}`)
  } catch (error) {
    const errorMessage = error.response
      ? `HTTP ${error.response.status}: ${error.response.data?.message || error.message}`
      : error.message
    throw new Error(`Upload failed: ${errorMessage}`)
  }
}

// Step 2: AI analyze document (giống frontend AIService.analyzeDocument)
async function analyzeDocumentWithAI(fileIds, authToken) {
  if (SKIP_AI) {
    console.log(`  → AI analysis skipped (SKIP_AI=true)`)
    return null
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/ai/analyze-document`,
      { fileIds },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: AI_TIMEOUT,
      }
    )

    // Response: { success: boolean, data: DocumentAnalysisResult }
    // Backend returns success: false with fallback data when AI fails
    if (response.data.data) {
      // Check if AI actually succeeded or returned fallback
      if (!response.data.success || response.data.data.confidence === 0) {
        // AI failed but returned fallback data - treat as failure
        throw new Error('AI analysis returned fallback data (file may be corrupt or unsupported)')
      }
      return response.data.data
    }

    throw new Error('AI analysis failed: No data returned')
  } catch (error) {
    const errorMessage = error.response
      ? `HTTP ${error.response.status}: ${error.response.data?.message || error.message}`
      : error.code === 'ECONNABORTED' ? `timeout of ${AI_TIMEOUT}ms exceeded`
      : error.message
    throw new Error(`AI analysis failed: ${errorMessage}`)
  }
}

// Step 3 & 4: Apply AI fields và Create document (giống frontend DocumentsService.createDocument)
async function createDocument(documentData, authToken) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/documents/create`,
      documentData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data.data
  } catch (error) {
    const errorMessage = error.response
      ? `HTTP ${error.response.status}: ${error.response.data?.message || error.message}`
      : error.message
    throw new Error(`Create document failed: ${errorMessage}`)
  }
}

// Xóa files đã upload (cleanup khi AI fail)
async function deleteUploadedFiles(fileIds, authToken) {
  for (const fileId of fileIds) {
    try {
      await axios.delete(`${API_BASE_URL}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
    } catch (error) {
      // Ignore delete errors - just cleanup
    }
  }
}

// Delay helper với exponential backoff
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retry wrapper cho AI quota limits
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 5000) {
  let lastError
  let currentDelay = initialDelay

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const isQuotaError = error.message.includes('429') ||
        error.message.includes('quota') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('rate limit')

      if (isQuotaError && attempt < maxRetries) {
        console.warn(`  ⚠ Quota limit hit, retrying in ${currentDelay / 1000}s... (attempt ${attempt}/${maxRetries})`)
        await delay(currentDelay)
        currentDelay *= 2
      } else {
        throw error
      }
    }
  }

  throw lastError
}

// Main seeding function - theo đúng flow frontend
async function seedUsersAndDocuments() {
  // Khởi tạo Prisma client
  if (!prisma) {
    try {
      const { PrismaClient } = require('@prisma/client')
      const { PrismaPg } = require('@prisma/adapter-pg')
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
      prisma = new PrismaClient({ adapter })
    } catch (error) {
      console.error('Error initializing PrismaClient:', error.message)
      throw error
    }
  }

  const seedFiles = await getSeedFiles()
  if (seedFiles.length === 0) {
    console.error('No seed files found in:', SEED_DIR)
    return
  }

  console.log(`Found ${seedFiles.length} seed files`)

  // Kiểm tra API server
  console.log('Checking API server connection...')
  try {
    await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 })
    console.log(`✓ API server is running at ${API_BASE_URL}`)
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('\n❌ ERROR: API server is not running!')
      console.error('   Please start the backend server first: npm run start:dev\n')
      process.exit(1)
    }
    console.error(`⚠ API server check failed: ${error.message}`)
  }

  const userCount = parseInt(process.env.SEED_USER_COUNT || '100', 10)
  console.log(`Will create ${userCount} users\n`)
  const users = Array.from({ length: userCount }, createRandomUser)

  const REQUEST_DELAY = 2000
  let successCount = 0
  let errorCount = 0

  for (const [index, userData] of users.entries()) {
    console.log(`\n--- Processing user ${index + 1}/${userCount} ---`)

    try {
      // 1. Đăng ký user
      console.log(`Registering user: ${userData.email}`)
      await registerUser(userData)
      console.log(`✓ Registered: ${userData.email}`)

      // 2. Lấy verification token và verify email
      await delay(500)
      const verificationToken = await getVerificationToken(userData.email)
      if (!verificationToken) {
        console.warn(`⚠ No verification token found for ${userData.email}, skipping...`)
        errorCount++
        continue
      }

      console.log(`Verifying email for: ${userData.email}`)
      await verifyEmail(verificationToken)
      console.log(`✓ Verified: ${userData.email}`)

      await delay(REQUEST_DELAY)

      // 3. Đăng nhập để lấy JWT token
      console.log(`Logging in: ${userData.email}`)
      const loginResult = await loginUser(userData.email, userData.password)
      const authToken = loginResult.accessToken
      console.log(`✓ Logged in: ${userData.email}`)

      await delay(REQUEST_DELAY)

      // 4. Tạo 2-4 tài liệu cho mỗi user (chỉ khi AI phân tích thành công)
      const numDocuments = faker.number.int({ min: 2, max: 4 })
      let successfulDocs = 0
      const maxAttempts = numDocuments * 3 // Cho phép retry nhiều lần
      let attempts = 0
      const usedFiles = new Set() // Track files đã dùng để không lặp lại

      while (successfulDocs < numDocuments && attempts < maxAttempts) {
        attempts++

        // Chọn files chưa dùng
        const availableFiles = seedFiles.filter(f => !usedFiles.has(f))
        if (availableFiles.length === 0) {
          console.warn(`  ⚠ No more available files to try`)
          break
        }

        const numFiles = faker.number.int({ min: 1, max: Math.min(3, availableFiles.length) })
        const selectedFiles = faker.helpers.arrayElements(availableFiles, numFiles)
        selectedFiles.forEach(f => usedFiles.add(f))

        let fileIds = []

        try {
          console.log(`\n  📄 Document ${successfulDocs + 1}/${numDocuments} (attempt ${attempts}):`)

          // === STEP 1: Upload files ===
          console.log(`  [Step 1] Uploading ${selectedFiles.length} file(s)...`)
          const uploadResults = await uploadFiles(selectedFiles, authToken)

          if (!uploadResults?.length) {
            console.warn(`  ⚠ No files uploaded, trying different files...`)
            continue
          }

          fileIds = uploadResults.map(file => file.id)
          console.log(`  ✓ Uploaded ${fileIds.length} file(s): ${fileIds.join(', ')}`)

          await delay(REQUEST_DELAY)

          // === STEP 2: AI analyze document (BẮT BUỘC thành công) ===
          console.log(`  [Step 2] AI analyzing document...`)
          let aiResult = null

          try {
            aiResult = await retryWithBackoff(
              () => analyzeDocumentWithAI(fileIds, authToken),
              3,
              5000
            )

            console.log(`  ✓ AI analysis completed:`)
            console.log(`    - Title: ${aiResult.title || '(none)'}`)
            console.log(`    - Description: ${(aiResult.description || '').substring(0, 50)}...`)
            console.log(`    - Tags: ${(aiResult.tags || []).join(', ') || '(none)'}`)
            console.log(`    - Category: ${aiResult.suggestedCategoryName || '(none)'} (${aiResult.suggestedCategoryId || 'no id'})`)
            console.log(`    - Confidence: ${aiResult.confidence ? Math.round(aiResult.confidence * 100) + '%' : 'N/A'}`)
          } catch (aiError) {
            console.warn(`  ⚠ AI analysis failed: ${aiError.message}`)
            console.log(`  → Deleting uploaded files and trying different files...`)
            await deleteUploadedFiles(fileIds, authToken)
            await delay(REQUEST_DELAY)
            continue // Thử lại với files khác
          }

          await delay(REQUEST_DELAY)

          // === STEP 3 & 4: Create document với AI data ===
          const documentData = {
            title: aiResult.title,
            description: aiResult.description || '',
            fileIds,
            categoryId: aiResult.suggestedCategoryId,
            isPublic: faker.datatype.boolean(),
            tags: aiResult.tags || [],
            language: aiResult.language || 'vi',
            downloadCost: null,
          }

          // Fallback category nếu AI không suggest
          if (!documentData.categoryId) {
            const defaultCategory = await prisma.category.findFirst({
              where: { isActive: true },
              select: { id: true, name: true },
            })
            if (defaultCategory) {
              documentData.categoryId = defaultCategory.id
              console.log(`  → Using default category: ${defaultCategory.name}`)
            }
          }

          console.log(`  [Step 3-4] Creating document with AI metadata...`)
          const document = await createDocument(documentData, authToken)

          console.log(`  ✓ Document created: ${document.id}`)
          console.log(`    - Title: ${document.title}`)
          console.log(`    - Category: ${document.category?.name || documentData.categoryId}`)
          console.log(`    - Public: ${document.isPublic}`)

          successfulDocs++
          await delay(REQUEST_DELAY)

        } catch (docError) {
          console.error(`  ✗ Error: ${docError.message}`)
          // Cleanup files nếu có lỗi
          if (fileIds.length > 0) {
            console.log(`  → Cleaning up uploaded files...`)
            await deleteUploadedFiles(fileIds, authToken)
          }
          await delay(REQUEST_DELAY)
        }
      }

      if (successfulDocs < numDocuments) {
        console.warn(`  ⚠ Only created ${successfulDocs}/${numDocuments} documents (AI analysis failed for others)`)
      }

      successCount++
      console.log(`\n✓ Completed user ${index + 1}: ${userData.email}`)

    } catch (error) {
      errorCount++
      console.error(`✗ Error processing user ${userData.email}: ${error.message}`)
    }

    if (index < users.length - 1) {
      await delay(REQUEST_DELAY)
    }
  }

  console.log('\n--- Seeding completed! ---')
  console.log(`Success: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
}

// Chạy script
seedUsersAndDocuments()
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(async () => {
    if (prisma) {
      await prisma.$disconnect()
    }
  })
