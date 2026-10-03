import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PetAvatar from './PetAvatar';

/**
 * Pixel Pet art seam contract: the reaction picker decides *which* drawing to
 * show, and the sheet decides *how many* frames it has. These tests pin the
 * second half — that a strip is walked one step per frame, along whichever axis
 * the art uses, and that a reaction without art falls back to the placeholder.
 */

const sheetImage = () => screen.getByTestId('pet-face').querySelector('img') as HTMLImageElement;

const loadWith = (img: HTMLImageElement, width: number, height: number) => {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
};

describe('PetAvatar', () => {
  it('falls back to the emoji placeholder when a reaction has no sheet', () => {
    render(<PetAvatar reaction="nod" />);

    expect(sheetImage()).toBeNull();
    expect(screen.getByTestId('pet-face')).toHaveTextContent('◠‿◠');
  });

  it('labels the art with the reaction it shows', () => {
    render(<PetAvatar reaction="happy" />);

    expect(screen.getByAltText('Pixel Pet 開心')).toBeInTheDocument();
  });

  it('holds on frame 0 until the sheet reports its size', () => {
    render(<PetAvatar reaction="idle" />);

    expect(sheetImage().style.animationName).toBe('');
  });

  it('walks a horizontal strip, one step per frame', () => {
    render(<PetAvatar reaction="idle" />);
    const img = sheetImage();

    loadWith(img, 288, 48);

    expect(img.style.animationName).toBe('pet-strip-x');
    expect(img.style.animationTimingFunction).toBe('steps(6)');
  });

  it('walks a vertical strip, one step per frame', () => {
    render(<PetAvatar reaction="happy" />);
    const img = sheetImage();

    loadWith(img, 48, 288);

    expect(img.style.animationName).toBe('pet-strip-y');
    expect(img.style.animationTimingFunction).toBe('steps(6)');
  });

  it('does not animate a single-frame sheet', () => {
    render(<PetAvatar reaction="idle" />);
    const img = sheetImage();

    loadWith(img, 48, 48);

    expect(img.style.animationName).toBe('');
  });
});
