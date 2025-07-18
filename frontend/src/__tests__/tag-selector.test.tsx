import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { userEvent } from '@testing-library/user-event'
import { TagSelector } from '@/components/annotation/tag-selector'

describe('TagSelector', () => {
  it('calls onTagSelect when a tag button is clicked', async () => {
    const onSelect = vi.fn()
    render(<TagSelector selectedTag="button" onTagSelect={onSelect} />)

    // Click on the Input tag
    const inputButton = screen.getByRole('button', { name: /input/i })
    await userEvent.click(inputButton)

    expect(onSelect).toHaveBeenCalledWith('input')
  })
}) 