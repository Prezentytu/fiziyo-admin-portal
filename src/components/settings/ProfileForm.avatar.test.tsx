import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProfileForm } from './ProfileForm';

// react-avatar-editor is deliberately NOT mocked: this test guards its ref contract across major bumps.

const setProfileImage = vi.fn();
const updateUser = vi.fn();

vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      imageUrl: 'https://img.clerk/old.jpg',
      primaryEmailAddress: { emailAddress: 'ada@test.pl' },
      setProfileImage,
    },
  }),
  useReverification: (fn: unknown) => fn,
}));

vi.mock('@apollo/client/react', () => ({
  useMutation: () => [updateUser, { loading: false }],
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const user = { id: 'u-1', email: 'ada@test.pl', fullname: 'Ada Terapeutka' };

let loadedImages = 0;

// happy-dom never decodes images, so the editor would not know the photo size.
class DecodedImage extends EventTarget {
  width = 640;
  height = 480;
  crossOrigin: string | null = null;

  set src(_value: string) {
    queueMicrotask(() => {
      loadedImages += 1;
      this.dispatchEvent(new Event('load'));
    });
  }
}

function selectPhoto(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('file input not rendered');
  const file = new File(['fake'], 'zdjecie.png', { type: 'image/png' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ProfileForm avatar crop', () => {
  beforeEach(() => {
    loadedImages = 0;
    vi.stubGlobal('Image', DecodedImage);
    setProfileImage.mockResolvedValue({ publicUrl: 'https://img.clerk/new.jpg' });
    updateUser.mockResolvedValue({});
    // happy-dom has no 2D canvas; drawing calls only need to exist.
    const context2d = new Proxy({} as CanvasRenderingContext2D, {
      get: (target, key) => (key in target ? Reflect.get(target, key) : () => undefined),
      set: (target, key, value) => Reflect.set(target, key, value),
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context2d);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback) {
      callback(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('uploads the cropped JPEG to Clerk and saves the new URL on the user', async () => {
    const onSuccess = vi.fn();
    const { container } = render(<ProfileForm user={user} clerkId="clerk_1" onSuccess={onSuccess} />);

    selectPhoto(container);
    expect(await screen.findByTestId('settings-profile-crop-dialog')).toBeInTheDocument();
    await waitFor(() => expect(loadedImages).toBe(1));

    await userEvent.click(screen.getByTestId('settings-profile-crop-confirm-btn'));

    await waitFor(() => expect(setProfileImage).toHaveBeenCalledTimes(1));
    const uploaded = setProfileImage.mock.calls[0][0].file as File;
    expect(uploaded.name).toBe('avatar.jpg');
    expect(uploaded.type).toBe('image/jpeg');
    await waitFor(() =>
      expect(updateUser).toHaveBeenCalledWith({
        variables: { clerkId: 'clerk_1', image: 'https://img.clerk/new.jpg' },
      })
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('rejects unsupported formats without opening the crop dialog', () => {
    const { container } = render(<ProfileForm user={user} clerkId="clerk_1" />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('file input not rendered');

    fireEvent.change(input, { target: { files: [new File(['x'], 'plik.webp', { type: 'image/webp' })] } });

    expect(screen.queryByTestId('settings-profile-crop-dialog')).not.toBeInTheDocument();
  });
});
