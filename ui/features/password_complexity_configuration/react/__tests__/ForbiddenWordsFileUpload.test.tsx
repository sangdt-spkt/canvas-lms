/*
 * Copyright (C) 2024 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import {render, screen, waitFor} from '@testing-library/react'
import ForbiddenWordsFileUpload from '../ForbiddenWordsFileUpload'
import doFetchApi from '@canvas/do-fetch-api-effect'
import userEvent from '@testing-library/user-event'

jest.mock('@canvas/do-fetch-api-effect')
const mockedDoFetchApi = doFetchApi as jest.MockedFunction<typeof doFetchApi>

describe('ForbiddenWordsFileUpload Component', () => {
  const defaultProps = {
    open: true,
    onDismiss: jest.fn(),
    onSave: jest.fn(),
    setForbiddenWordsUrl: jest.fn(),
    setForbiddenWordsFilename: jest.fn(),
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the modal with the correct heading', () => {
      render(<ForbiddenWordsFileUpload {...defaultProps} />)
      expect(screen.getByText('Upload Forbidden Words/Terms List')).toBeInTheDocument()
      expect(screen.getByText('Upload File')).toBeInTheDocument()
    })

    it('displays the FileDrop component when no file is uploaded', () => {
      render(<ForbiddenWordsFileUpload {...defaultProps} />)
      expect(screen.getByText('Upload File')).toBeInTheDocument()
      expect(screen.getByText('Drag and drop, or upload from your computer')).toBeInTheDocument()
    })

    it('displays the file table when a file is uploaded', () => {
      render(
        <ForbiddenWordsFileUpload
          {...defaultProps}
          setForbiddenWordsUrl={jest.fn()}
          setForbiddenWordsFilename={jest.fn()}
        />
      )
      const file = new File(['dummy content'], 'test.txt', {type: 'text/plain'})
      const input = screen.getByLabelText(/drag and drop, or upload from your computer/i)
      userEvent.upload(input, file)
      waitFor(() => {
        expect(screen.getByText('test.txt')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions with API', () => {
    beforeEach(() => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockResolvedValue({
          fileUrl: 'mockFileUrl',
          filename: 'mockFilename',
        }),
        headers: new Headers(),
      } as Partial<Response> as Response

      mockedDoFetchApi.mockResolvedValueOnce({
        json: {fileUrl: 'mockFileUrl', filename: 'mockFilename'},
        response: mockResponse,
      })
    })

    it('handles file drop and sets the file name and URL on upload', async () => {
      const file = new File(['dummy content'], 'test.txt', {type: 'text/plain'})
      render(<ForbiddenWordsFileUpload {...defaultProps} />)
      const input = screen.getByLabelText(/drag and drop, or upload from your computer/i)
      await userEvent.upload(input, file)
      await waitFor(() => screen.getByText('test.txt'))
      expect(defaultProps.setForbiddenWordsFilename).not.toHaveBeenCalled()
      expect(defaultProps.setForbiddenWordsUrl).not.toHaveBeenCalled()
      const uploadButton = await waitFor(() => screen.getByText('Upload').closest('button'))
      if (!uploadButton) {
        throw new Error('Upload button not found')
      }
      await userEvent.click(uploadButton)
      await waitFor(() => {
        expect(defaultProps.setForbiddenWordsFilename).toHaveBeenCalledWith('test.txt')
        expect(defaultProps.setForbiddenWordsUrl).toHaveBeenCalledWith(expect.any(String))
      })
    })

    it('calls onSave after a successful file upload', async () => {
      render(<ForbiddenWordsFileUpload {...defaultProps} />)
      const file = new File(['dummy content'], 'test.txt', {type: 'text/plain'})
      const input = screen.getByLabelText(/drag and drop, or upload from your computer/i)
      await userEvent.upload(input, file)
      await waitFor(() => screen.getByText('test.txt'))
      const uploadButton = screen.getByText('Upload').closest('button')
      if (!uploadButton) {
        throw new Error('Upload button not found')
      }
      await userEvent.click(uploadButton)
      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalled()
      })
    })
  })

  describe('User Interactions without API', () => {
    it('resets state on cancel and does not call prop functions', async () => {
      render(<ForbiddenWordsFileUpload {...defaultProps} />)
      const file = new File(['dummy content'], 'test.txt', {type: 'text/plain'})
      const input = screen.getByLabelText(/drag and drop, or upload from your computer/i)
      await userEvent.upload(input, file)
      await waitFor(() => screen.getByText('test.txt'))
      const cancelButton = await waitFor(() => screen.getByText('Cancel').closest('button'))
      if (!cancelButton) {
        throw new Error('Cancel button not found')
      }
      await userEvent.click(cancelButton)
      expect(defaultProps.setForbiddenWordsFilename).not.toHaveBeenCalled()
      expect(defaultProps.setForbiddenWordsUrl).not.toHaveBeenCalled()
      expect(defaultProps.onDismiss).toHaveBeenCalled()
    })
  })
})
