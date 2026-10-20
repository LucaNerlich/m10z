// @vitest-environment jsdom
import {describe, expect, test} from 'vitest';

import {isEditableTarget} from './editableTarget';

describe('isEditableTarget', () => {
    test.each(['input', 'textarea'])('treats <%s> as editable', (tag) => {
        expect(isEditableTarget(document.createElement(tag))).toBe(true);
    });

    test('treats a contenteditable element as editable', () => {
        const element = document.createElement('div');
        element.contentEditable = 'true';
        // jsdom does not derive isContentEditable from the attribute.
        Object.defineProperty(element, 'isContentEditable', {value: true});
        expect(isEditableTarget(element)).toBe(true);
    });

    test('does not treat buttons or null targets as editable', () => {
        expect(isEditableTarget(document.createElement('button'))).toBe(false);
        expect(isEditableTarget(null)).toBe(false);
    });
});
