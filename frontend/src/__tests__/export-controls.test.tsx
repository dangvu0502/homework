import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { userEvent } from '@testing-library/user-event'
import { ExportControls } from '@/components/annotation/export-controls'
import type { BoundingBox } from '@/types/annotation'

describe('ExportControls', () => {
  it('calls URL.createObjectURL when Download JSON button clicked', async () => {
    const boxes: BoundingBox[] = [
      { id: '1', x: 10, y: 20, width: 50, height: 40, tag: 'button' }
    ]

    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL')

    // Prevent jsdom navigation not-implemented error when anchor.click triggers navigation
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(
      <ExportControls
        projectName="Test Project"
        imageName="test.png"
        imageUrl="http://example.com/test.png"
        boundingBoxes={boxes}
      />
    )

    const downloadBtn = screen.getByRole('button', { name: /download json/i })
    await userEvent.click(downloadBtn)

    expect(createObjectURLSpy).toHaveBeenCalled()

    createObjectURLSpy.mockRestore()
  })
}) 