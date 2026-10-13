import { describe, expect, test } from '@jest/globals';

import { enumOptions, resolveEnumOptions } from '../../../src/serialization/componentCatalog';
import { MockNumericEnum, MockStringEnum } from '../mocks/components';

describe('Testing component catalog enum options', () => {
    test('Should create options from a string enum', () => {
        expect(enumOptions(MockStringEnum)).toEqual([
            { label: 'FIRST', value: 'first' },
            { label: 'SECOND', value: 'second' },
        ]);
    });

    test('Should create options from a numeric enum without its reverse mapping', () => {
        expect(enumOptions(MockNumericEnum)).toEqual([
            { label: 'ZERO', value: 0 },
            { label: 'ONE', value: 1 },
            { label: 'TWO', value: 2 },
        ]);
    });

    test('Should resolve options created with enumOptions unchanged', () => {
        const options = enumOptions(MockNumericEnum);

        expect(resolveEnumOptions(options)).toEqual(options);
    });

    test('Should resolve options from a list of values', () => {
        expect(resolveEnumOptions(['idle', 'run'])).toEqual([
            { label: 'idle', value: 'idle' },
            { label: 'run', value: 'run' },
        ]);
    });
});
