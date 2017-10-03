import { TableScrollModel } from './table-scroll.model';

describe('TableScrollModel', () => {

  it('has an inital state', () => {
    const model = new TableScrollModel();

    expect(model.positionRatio).toBe(0);
    expect(model.rangeRatio).toBe(1);
    expect(model.start).toBe(0);
    expect(model.end).toBe(0);
    expect(model.size).toBe(0);
  });

  it('computes initial state for size 100', () => {
    const model = new TableScrollModel();
    model.setSize(100);

    expect(model.start).toBe(0);
    expect(model.end).toBe(0);
    expect(model.positionRatio).toBe(0);

    expect(model.rangeRatio).toBe(0);
    expect(model.size).toBe(100);
  });

  it('computes state when growing by 10', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    incrementEnd(model, 10);

    expect(model.start).toBe(0);
    expect(model.end).toBe(10);
    expect(model.positionRatio).toBe(0);

    expect(model.rangeRatio).toBe(.1);
    expect(model.size).toBe(100);
  });

  it('computes state when changing the position', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    incrementEnd(model, 10);
    model.movePosition(.5);

    expect(model.start).toBe(50);
    expect(model.end).toBe(50);
    expect(model.positionRatio).toBe(.5);

    expect(model.rangeRatio).toBe(0);
    expect(model.size).toBe(100);
  });

  it('computes state when changing the position and growing by 10', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    incrementEnd(model, 10);
    model.movePosition(.5);
    incrementEnd(model, 10);

    expect(model.start).toBe(50);
    expect(model.end).toBe(60);
    expect(model.positionRatio).toBe(.5);

    expect(model.rangeRatio).toBe(.1);
    expect(model.size).toBe(100);
  });

  it('computes state when changing the position back to 0.1 and growing by 10', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    incrementEnd(model, 10);
    model.movePosition(.5);
    incrementEnd(model, 10);
    model.movePosition(-.4);
    incrementEnd(model, 10);

    expect(model.start).toBe(10);
    expect(model.end).toBe(20);
    expect(model.positionRatio).toBeCloseTo(.1);
    expect(model.rangeRatio).toBe(.1);
    expect(model.size).toBe(100);
  });

  it('computes state when scrolling by 1 record forward', () => {
    const model = new TableScrollModel();
    model.setSize(10);
    model.movePosition(+.1);

    expect(model.start).toBe(1);
    expect(model.end).toBe(1);
  });

  it('computes state when scrolling by 1 record backward', () => {
    const model = new TableScrollModel();
    model.setSize(10);
    model.setPositionRatio(1);
    model.movePosition(-.1);

    expect(model.start).toBe(9);
    expect(model.end).toBe(9);
  });

  it('changes the range even if moving the position forward with a distance smaller than the record-ratio', () => {
    const model = new TableScrollModel();
    model.setSize(10);
    model.movePosition(+.00001);

    expect(model.start).toBe(1);
    expect(model.end).toBe(1);
  });

  it('changes the range even if moving the position backward with a distance smaller than the record-ratio', () => {
    const model = new TableScrollModel();
    model.setSize(10);
    model.setPositionRatio(1);
    model.movePosition(-.00001);

    expect(model.start).toBe(9);
    expect(model.end).toBe(9);
  });

  it('does not allow to move position before the first record', () => {
    const model = new TableScrollModel();
    model.setSize(10);
    model.setPositionRatio(0);
    model.movePosition(-.1);

    expect(model.start).toBe(0);
    expect(model.end).toBe(0);
  });

  it('does not allow to move position after the last record', () => {
    const model = new TableScrollModel();
    model.setSize(10);
    model.setPositionRatio(1);
    model.movePosition(+.1);

    expect(model.start).toBe(10);
    expect(model.end).toBe(10);
  });

  it('computes state when scrolling to the beginning', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    model.setPositionRatio(.5);
    model.movePosition(-.5);

    expect(model.start).toBe(0);
    expect(model.end).toBe(0);
  });

  it('computes state when scrolling to the end', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    model.setPositionRatio(.5);
    model.movePosition(+.5);

    expect(model.start).toBe(100);
    expect(model.end).toBe(100);
  });

  it('crops the range when reducing the size to a value between start and end', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    incrementEnd(model, 10);
    model.movePosition(.5);
    incrementEnd(model, 9);
    model.setSize(55);

    expect(model.start).toBe(50);
    expect(model.end).toBe(55);
    expect(model.positionRatio).toBe(50 / 55);
    expect(model.rangeRatio).toBe(5 / 55);
    expect(model.size).toBe(55);
  });

  it('moves the range to the end when reducing the size to a value smaller than start', () => {
    const model = new TableScrollModel();
    model.setSize(100);
    incrementEnd(model, 10);
    model.movePosition(.5);
    incrementEnd(model, 10);
    model.setSize(20);

    expect(model.start).toBe(20);
    expect(model.end).toBe(20);
    expect(model.positionRatio).toBe(1);
    expect(model.rangeRatio).toBe(0);
    expect(model.size).toBe(20);
  });
});

function incrementEnd(scrollModel: TableScrollModel, increment: number): void {
  for (let i = 0; i < increment; i++) {
    scrollModel.tryIncrementEnd();
  }
}
