import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FileUpload } from '@/components/ui/file-upload'
import { userEvent } from '@testing-library/user-event'

describe('FileUpload', () => {
  it('calls onFileSelect and shows preview when a file is chosen', async () => {
    const user = userEvent.setup()
    const file = new File(['image-bytes'], 'test-image.png', { type: 'image/png' })
    const handleSelect = vi.fn()

    render(<FileUpload onFileSelect={handleSelect} />)

    // Locate the hidden file input directly
    const input = document.querySelector('input[type="file"]') as HTMLInputElement

    expect(input).not.toBeNull()

    // Upload the file
    await user.upload(input, file)

    expect(handleSelect).toHaveBeenCalledWith(file, 'blob:mock-url')

    // Preview image should be rendered
    const img = await screen.findByAltText(/upload preview/i)
    expect(img).toBeInTheDocument()
  })
}) 