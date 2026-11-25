import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ExerciseVideosField } from '../ExerciseVideosField';

const TEST_ID = 'exercise-detail-video-url-input';
const FIRST = 'https://vimeo.com/1';
const SECOND = 'https://youtu.be/2';

function renderField(value: string[]) {
  const onChange = vi.fn();
  render(<ExerciseVideosField value={value} dirty={false} disabled={false} onChange={onChange} />);
  return onChange;
}

describe('ExerciseVideosField', () => {
  it('pusta lista ma jedno pole pod dotychczasowym test id i bez przycisków kolejności', () => {
    const onChange = renderField([]);

    fireEvent.change(screen.getByTestId(TEST_ID), { target: { value: FIRST } });

    expect(onChange).toHaveBeenCalledWith([FIRST]);
    expect(screen.queryByTestId(`${TEST_ID}-remove-btn-0`)).not.toBeInTheDocument();
    expect(screen.queryByText('Film główny')).not.toBeInTheDocument();
  });

  it('pierwszy wiersz to film główny, a strzałki zmieniają kolejność', () => {
    const onChange = renderField([FIRST, SECOND]);

    expect(screen.getByTestId(TEST_ID)).toHaveValue(FIRST);
    expect(screen.getByText('Film główny')).toBeInTheDocument();
    expect(screen.getByTestId(`${TEST_ID}-up-btn-0`)).toBeDisabled();
    expect(screen.getByTestId(`${TEST_ID}-down-btn-1`)).toBeDisabled();

    fireEvent.click(screen.getByTestId(`${TEST_ID}-up-btn-1`));
    expect(onChange).toHaveBeenLastCalledWith([SECOND, FIRST]);

    fireEvent.click(screen.getByTestId(`${TEST_ID}-remove-btn-0`));
    expect(onChange).toHaveBeenLastCalledWith([SECOND]);

    fireEvent.click(screen.getByTestId(`${TEST_ID}-add-btn`));
    expect(onChange).toHaveBeenLastCalledWith([FIRST, SECOND, '']);
  });

  it('przy limicie nie da się dodać kolejnego filmu, a błędny adres ma komunikat przy polu', () => {
    const full = Array.from({ length: 10 }, (_, index) => `https://vimeo.com/${index}`);
    full[3] = 'vimeo.com/bez-protokolu';
    renderField(full);

    expect(screen.getByTestId(`${TEST_ID}-add-btn`)).toBeDisabled();
    expect(screen.getByTestId(`${TEST_ID}-error-3`)).toHaveTextContent('https://');
    expect(screen.getByTestId(`${TEST_ID}-3`)).toHaveAttribute('aria-invalid', 'true');
  });

  it('Enter w polu woła onSubmit, a Enter z Cmd/Ctrl nie', () => {
    const onSubmit = vi.fn();
    render(
      <ExerciseVideosField
        value={[FIRST, SECOND]}
        dirty={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.keyDown(screen.getByTestId(`${TEST_ID}-1`), { key: 'Enter', metaKey: true });
    fireEvent.keyDown(screen.getByTestId(`${TEST_ID}-1`), { key: 'Enter', ctrlKey: true });
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId(`${TEST_ID}-1`), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('start filmu zapisuje się w linku po wyjściu z pola, a błędny zapis nie zmienia linku (SPEC-064)', () => {
    const onChange = renderField([FIRST, 'https://cdn.example.com/clip.mp4']);
    const start = screen.getByTestId(`${TEST_ID}-start-0`);

    expect(screen.queryByTestId(`${TEST_ID}-start-1`)).not.toBeInTheDocument();

    fireEvent.change(start, { target: { value: '1:75' } });
    fireEvent.blur(start);
    expect(start).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(start, { target: { value: '1:30' } });
    fireEvent.keyDown(start, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(['https://vimeo.com/1#t=90s', 'https://cdn.example.com/clip.mp4']);
  });

  it('pole startu pokazuje znacznik z linku i czyści go pustym wpisem', () => {
    const onChange = renderField(['https://vimeo.com/1#t=90s']);
    const start = screen.getByTestId(`${TEST_ID}-start-0`);
    expect(start).toHaveValue('1:30');

    fireEvent.change(start, { target: { value: '' } });
    fireEvent.blur(start);
    expect(onChange).toHaveBeenLastCalledWith([FIRST]);
  });
});
