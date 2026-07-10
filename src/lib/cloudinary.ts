import { cloudinaryConfig } from '@/firebase'

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', cloudinaryConfig.uploadPreset)
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Cloudinary error:', errorData)
      throw new Error(`Failed to upload image: ${errorData.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.secure_url
  } catch (error) {
    console.error('Error uploading image:', error)
    throw error
  }
} 